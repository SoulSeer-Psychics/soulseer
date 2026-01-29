import Stripe from 'stripe';
import { db } from '@/lib/db';
import { clientBalances, transactions, users, readerProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Virtual gift pricing
export const VIRTUAL_GIFT_PRICES = {
  rose: 1.00,
  crystal: 2.50,
  star: 5.00,
  moon: 10.00,
  sun: 25.00,
  diamond: 50.00,
} as const;

// Platform fee percentage
export const PLATFORM_FEE_PERCENTAGE = 30;

/**
 * Create a Stripe customer for a user
 */
export async function createStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  // Update client balance with Stripe customer ID
  await db
    .update(clientBalances)
    .set({ stripeCustomerId: customer.id })
    .where(eq(clientBalances.userId, userId));

  return customer;
}

/**
 * Create a Stripe Connect account for a reader
 */
export async function createReaderStripeAccount(
  readerId: string,
  email: string,
  country: string = 'US'
): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type: 'express',
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: {
      readerId,
    },
  });

  // Update reader profile with Stripe account ID
  await db
    .update(readerProfiles)
    .set({ stripeAccountId: account.id })
    .where(eq(readerProfiles.userId, readerId));

  return account;
}

/**
 * Create an account link for reader onboarding
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

/**
 * Add funds to client balance
 */
export async function addFundsToClientBalance(
  userId: string,
  amount: number,
  paymentMethodId?: string
): Promise<{ paymentIntent: Stripe.PaymentIntent; transaction: any }> {
  // Get or create Stripe customer
  let clientBalance = await db.query.clientBalances.findFirst({
    where: eq(clientBalances.userId, userId),
  });

  let customerId = clientBalance?.stripeCustomerId;

  if (!customerId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    const customer = await createStripeCustomer(userId, user.email, `${user.firstName} ${user.lastName}`);
    customerId = customer.id;
  }

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    confirmation_method: paymentMethodId ? 'automatic' : 'manual',
    confirm: !!paymentMethodId,
    metadata: {
      userId,
      type: 'add_funds',
    },
  });

  // Create transaction record
  const [transaction] = await db.insert(transactions).values({
    userId,
    type: 'topup',
    amount: amount.toString(),
    status: paymentMethodId ? 'processing' : 'pending',
    stripePaymentIntentId: paymentIntent.id,
    description: 'Add funds to account balance',
  }).returning();

  return { paymentIntent, transaction };
}

/**
 * Process reading session payment
 */
export async function processReadingPayment(
  clientId: string,
  readerId: string,
  sessionId: string,
  amount: number,
  duration: number
): Promise<void> {
  const platformFee = (amount * PLATFORM_FEE_PERCENTAGE) / 100;
  const readerEarnings = amount - platformFee;

  // Start a database transaction
  await db.transaction(async (tx) => {
    // Deduct from client balance
    await tx
      .update(clientBalances)
      .set({
        balance: sql`${clientBalances.balance} - ${amount}`,
        totalSpent: sql`${clientBalances.totalSpent} + ${amount}`,
      })
      .where(eq(clientBalances.userId, clientId));

    // Add to reader earnings
    await tx
      .update(readerProfiles)
      .set({
        pendingPayout: sql`${readerProfiles.pendingPayout} + ${readerEarnings}`,
        totalEarnings: sql`${readerProfiles.totalEarnings} + ${readerEarnings}`,
        totalMinutes: sql`${readerProfiles.totalMinutes} + ${Math.ceil(duration / 60)}`,
      })
      .where(eq(readerProfiles.userId, readerId));

    // Record client transaction
    await tx.insert(transactions).values({
      userId: clientId,
      sessionId,
      type: 'charge',
      amount: amount.toString(),
      status: 'completed',
      description: `Reading session payment`,
      platformFee: platformFee.toString(),
    });

    // Record reader transaction
    await tx.insert(transactions).values({
      userId: readerId,
      sessionId,
      type: 'earning',
      amount: readerEarnings.toString(),
      status: 'completed',
      description: `Reading session earnings`,
    });
  });
}

/**
 * Process virtual gift payment
 */
export async function processVirtualGiftPayment(
  senderId: string,
  receiverId: string,
  giftType: keyof typeof VIRTUAL_GIFT_PRICES,
  quantity: number,
  streamId?: string,
  sessionId?: string
): Promise<void> {
  const unitPrice = VIRTUAL_GIFT_PRICES[giftType];
  const totalValue = unitPrice * quantity;
  const platformFee = (totalValue * PLATFORM_FEE_PERCENTAGE) / 100;
  const receiverAmount = totalValue - platformFee;

  await db.transaction(async (tx) => {
    // Deduct from sender balance
    await tx
      .update(clientBalances)
      .set({
        balance: sql`${clientBalances.balance} - ${totalValue}`,
        totalSpent: sql`${clientBalances.totalSpent} + ${totalValue}`,
      })
      .where(eq(clientBalances.userId, senderId));

    // Add to receiver earnings (if reader)
    const readerProfile = await tx.query.readerProfiles.findFirst({
      where: eq(readerProfiles.userId, receiverId),
    });

    if (readerProfile) {
      await tx
        .update(readerProfiles)
        .set({
          pendingPayout: sql`${readerProfiles.pendingPayout} + ${receiverAmount}`,
          totalEarnings: sql`${readerProfiles.totalEarnings} + ${receiverAmount}`,
        })
        .where(eq(readerProfiles.userId, receiverId));
    }

    // Record sender transaction
    await tx.insert(transactions).values({
      userId: senderId,
      sessionId,
      type: 'charge',
      amount: totalValue.toString(),
      status: 'completed',
      description: `Virtual gift: ${quantity}x ${giftType}`,
      platformFee: platformFee.toString(),
    });

    // Record receiver transaction
    if (readerProfile) {
      await tx.insert(transactions).values({
        userId: receiverId,
        sessionId,
        type: 'earning',
        amount: receiverAmount.toString(),
        status: 'completed',
        description: `Virtual gift received: ${quantity}x ${giftType}`,
      });
    }

    // Update stream total gifts if applicable
    if (streamId) {
      await tx
        .update(liveStreams)
        .set({
          totalGiftsReceived: sql`${liveStreams.totalGiftsReceived} + ${totalValue}`,
        })
        .where(eq(liveStreams.id, streamId));
    }
  });
}

/**
 * Process daily payouts to readers
 */
export async function processDailyPayouts(): Promise<void> {
  const readersForPayout = await db.query.readerProfiles.findMany({
    where: and(
      gte(readerProfiles.pendingPayout, '15.00'),
      isNotNull(readerProfiles.stripeAccountId),
      eq(readerProfiles.isApproved, true)
    ),
    with: {
      user: true,
    },
  });

  for (const reader of readersForPayout) {
    try {
      const amount = parseFloat(reader.pendingPayout);
      const amountInCents = Math.round(amount * 100);

      // Create transfer to reader's Stripe account
      const transfer = await stripe.transfers.create({
        amount: amountInCents,
        currency: 'usd',
        destination: reader.stripeAccountId!,
        metadata: {
          readerId: reader.userId,
          type: 'daily_payout',
        },
      });

      // Update reader profile and create transaction
      await db.transaction(async (tx) => {
        await tx
          .update(readerProfiles)
          .set({
            pendingPayout: '0.00',
          })
          .where(eq(readerProfiles.userId, reader.userId));

        await tx.insert(transactions).values({
          userId: reader.userId,
          type: 'payout',
          amount: amount.toString(),
          status: 'completed',
          description: 'Daily payout',
          stripeChargeId: transfer.id,
        });
      });

      console.log(`Payout processed for reader ${reader.userId}: $${amount}`);
    } catch (error) {
      console.error(`Failed to process payout for reader ${reader.userId}:`, error);
      
      // Record failed payout
      await db.insert(transactions).values({
        userId: reader.userId,
        type: 'payout',
        amount: reader.pendingPayout,
        status: 'failed',
        description: 'Daily payout',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Process refund
 */
export async function processRefund(
  transactionId: string,
  amount?: number,
  reason?: string
): Promise<Stripe.Refund> {
  const transaction = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
  });

  if (!transaction || !transaction.stripePaymentIntentId) {
    throw new Error('Transaction not found or missing Stripe payment intent');
  }

  const refund = await stripe.refunds.create({
    payment_intent: transaction.stripePaymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
    reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
    metadata: {
      originalTransactionId: transactionId,
    },
  });

  // Update original transaction
  await db
    .update(transactions)
    .set({
      status: 'refunded',
    })
    .where(eq(transactions.id, transactionId));

  // Create refund transaction
  await db.insert(transactions).values({
    userId: transaction.userId,
    sessionId: transaction.sessionId,
    orderId: transaction.orderId,
    type: 'refund',
    amount: (refund.amount / 100).toString(),
    status: 'completed',
    stripeChargeId: refund.id,
    description: `Refund for transaction ${transactionId}`,
  });

  return refund;
}

/**
 * Create setup intent for saving payment methods
 */
export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  return await stripe.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
  });
}

/**
 * Get customer payment methods
 */
export async function getCustomerPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return paymentMethods.data;
}

/**
 * Delete payment method
 */
export async function deletePaymentMethod(paymentMethodId: string): Promise<void> {
  await stripe.paymentMethods.detach(paymentMethodId);
}

/**
 * Update default payment method
 */
export async function updateDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

/**
 * Get account balance for a reader
 */
export async function getAccountBalance(accountId: string): Promise<Stripe.Balance> {
  return await stripe.balance.retrieve({
    stripeAccount: accountId,
  });
}

/**
 * Handle Stripe webhooks
 */
export async function handleStripeWebhook(
  payload: string,
  signature: string
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error}`);
  }

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
      console.log('Transfer created:', event.data.object);
      break;

    case 'invoice.payment_failed':
      console.log('Invoice payment failed:', event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
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
      stripeChargeId: paymentIntent.latest_charge as string,
    })
    .where(eq(transactions.id, transaction.id));

  // If this is an add funds transaction, update client balance
  if (transaction.type === 'topup') {
    await db
      .update(clientBalances)
      .set({
        balance: sql`${clientBalances.balance} + ${transaction.amount}`,
      })
      .where(eq(clientBalances.userId, transaction.userId));
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const transaction = await db.query.transactions.findFirst({
    where: eq(transactions.stripePaymentIntentId, paymentIntent.id),
  });

  if (!transaction) {
    console.error('Transaction not found for payment intent:', paymentIntent.id);
    return;
  }

  await db
    .update(transactions)
    .set({
      status: 'failed',
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
    })
    .where(eq(transactions.id, transaction.id));
}

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const readerId = account.metadata?.readerId;
  
  if (!readerId) {
    return;
  }

  // Update reader profile with account capabilities
  await db
    .update(readerProfiles)
    .set({
      // Add any account-related updates here
    })
    .where(eq(readerProfiles.userId, readerId));
}

// Import necessary items from schema
import { sql, and, gte, isNotNull } from 'drizzle-orm';
import { liveStreams } from '@/lib/db/schema';
