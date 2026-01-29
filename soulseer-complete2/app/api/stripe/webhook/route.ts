import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { 
  transactions, 
  clientBalances, 
  readerProfiles, 
  users,
  readingSessions 
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
        
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;
        
      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;
        
      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      case 'invoice.payment_succeeded':
        // Handle subscription payments if implemented
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Find the transaction by payment intent ID
    const transaction = await db.query.transactions.findFirst({
      where: eq(transactions.stripePaymentIntentId, paymentIntent.id),
    });

    if (!transaction) {
      console.error('Transaction not found for payment intent:', paymentIntent.id);
      return;
    }

    // Update transaction status
    await db
      .update(transactions)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transaction.id));

    // If this is a balance top-up, update client balance
    if (transaction.type === 'topup' && transaction.userId) {
      const amount = parseFloat(transaction.amount);
      
      // Get current balance
      const clientBalance = await db.query.clientBalances.findFirst({
        where: eq(clientBalances.userId, transaction.userId),
      });

      if (clientBalance) {
        const newBalance = parseFloat(clientBalance.balance) + amount;
        
        await db
          .update(clientBalances)
          .set({
            balance: newBalance.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(clientBalances.userId, transaction.userId));
      }
    }

    console.log(`Payment succeeded for transaction ${transaction.id}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Find the transaction by payment intent ID
    const transaction = await db.query.transactions.findFirst({
      where: eq(transactions.stripePaymentIntentId, paymentIntent.id),
    });

    if (!transaction) {
      console.error('Transaction not found for failed payment:', paymentIntent.id);
      return;
    }

    // Update transaction status
    await db
      .update(transactions)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transaction.id));

    // If this was a reading session payment, handle the failure
    if (transaction.readingSessionId) {
      await db
        .update(readingSessions)
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(readingSessions.id, transaction.readingSessionId));
    }

    console.log(`Payment failed for transaction ${transaction.id}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  try {
    // Find reader by Stripe account ID
    const readerProfile = await db.query.readerProfiles.findFirst({
      where: eq(readerProfiles.stripeAccountId, account.id),
    });

    if (!readerProfile) {
      console.error('Reader not found for account:', account.id);
      return;
    }

    // Update reader profile with account status
    const canReceivePayouts = account.payouts_enabled && account.details_submitted;
    
    await db
      .update(readerProfiles)
      .set({
        stripeAccountStatus: account.requirements?.disabled_reason || 
          (canReceivePayouts ? 'active' : 'pending'),
        updatedAt: new Date(),
      })
      .where(eq(readerProfiles.id, readerProfile.id));

    console.log(`Updated account status for reader ${readerProfile.id}`);
  } catch (error) {
    console.error('Error handling account update:', error);
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  try {
    // Create transaction record for the transfer
    const metadata = transfer.metadata;
    
    if (metadata.readerId && metadata.sessionId) {
      await db.insert(transactions).values({
        userId: metadata.readerId,
        type: 'payout',
        amount: (transfer.amount / 100).toFixed(2), // Convert from cents
        currency: transfer.currency,
        status: 'pending',
        stripeTransferId: transfer.id,
        readingSessionId: metadata.sessionId,
        metadata: JSON.stringify({
          type: 'reader_earning',
          transferId: transfer.id,
        }),
        createdAt: new Date(),
      });
    }

    console.log(`Transfer created: ${transfer.id}`);
  } catch (error) {
    console.error('Error handling transfer creation:', error);
  }
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  try {
    // Update all pending transactions for this payout
    await db
      .update(transactions)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(transactions.stripePayoutId, payout.id));

    // If this is a reader payout, update their balance
    const metadata = payout.metadata;
    if (metadata.readerId) {
      const payoutAmount = payout.amount / 100; // Convert from cents
      
      const readerProfile = await db.query.readerProfiles.findFirst({
        where: eq(readerProfiles.userId, metadata.readerId),
      });

      if (readerProfile) {
        const newPendingBalance = Math.max(0, 
          parseFloat(readerProfile.pendingEarnings) - payoutAmount
        );
        
        await db
          .update(readerProfiles)
          .set({
            pendingEarnings: newPendingBalance.toFixed(2),
            totalEarnings: (parseFloat(readerProfile.totalEarnings) + payoutAmount).toFixed(2),
            lastPayoutAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(readerProfiles.id, readerProfile.id));
      }
    }

    console.log(`Payout completed: ${payout.id}`);
  } catch (error) {
    console.error('Error handling payout completion:', error);
  }
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  try {
    // Update all transactions for this payout as failed
    await db
      .update(transactions)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(transactions.stripePayoutId, payout.id));

    console.log(`Payout failed: ${payout.id}`);
  } catch (error) {
    console.error('Error handling payout failure:', error);
  }
}

// Configure the route to accept POST requests only
export const dynamic = 'force-dynamic';
