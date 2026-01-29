import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { readerProfiles, transactions, users } from '@/lib/db/schema';
import { eq, gte } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const MINIMUM_PAYOUT_AMOUNT = 15.00; // $15 minimum

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron or authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting daily payout process...');

    // Get all readers with pending earnings >= minimum payout amount
    const readersForPayout = await db
      .select({
        id: readerProfiles.id,
        userId: readerProfiles.userId,
        displayName: readerProfiles.displayName,
        pendingEarnings: readerProfiles.pendingEarnings,
        stripeAccountId: readerProfiles.stripeAccountId,
        stripeAccountStatus: readerProfiles.stripeAccountStatus,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(readerProfiles)
      .innerJoin(users, eq(readerProfiles.userId, users.id))
      .where(
        gte(readerProfiles.pendingEarnings, MINIMUM_PAYOUT_AMOUNT.toFixed(2))
      );

    console.log(`Found ${readersForPayout.length} readers eligible for payout`);

    const payoutResults = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each reader's payout
    for (const reader of readersForPayout) {
      try {
        const pendingAmount = parseFloat(reader.pendingEarnings);
        
        // Skip if below minimum
        if (pendingAmount < MINIMUM_PAYOUT_AMOUNT) {
          continue;
        }

        // Check if reader has valid Stripe account
        if (!reader.stripeAccountId || reader.stripeAccountStatus !== 'active') {
          payoutResults.errors.push(
            `Reader ${reader.displayName} (${reader.user.email}) has invalid Stripe account`
          );
          payoutResults.failed++;
          continue;
        }

        // Verify Stripe account can receive payouts
        const account = await stripe.accounts.retrieve(reader.stripeAccountId);
        if (!account.payouts_enabled) {
          payoutResults.errors.push(
            `Reader ${reader.displayName} (${reader.user.email}) cannot receive payouts`
          );
          payoutResults.failed++;
          continue;
        }

        // Convert to cents for Stripe
        const amountInCents = Math.round(pendingAmount * 100);

        // Create transfer to reader's Stripe account
        const transfer = await stripe.transfers.create({
          amount: amountInCents,
          currency: 'usd',
          destination: reader.stripeAccountId,
          metadata: {
            readerId: reader.userId,
            readerName: reader.displayName,
            readerEmail: reader.user.email,
            payoutType: 'daily_automatic',
          },
        });

        // Record the transaction
        await db.insert(transactions).values({
          userId: reader.userId,
          type: 'payout',
          amount: pendingAmount.toFixed(2),
          currency: 'usd',
          status: 'pending',
          stripeTransferId: transfer.id,
          metadata: JSON.stringify({
            type: 'daily_payout',
            transferId: transfer.id,
            originalPendingAmount: pendingAmount,
          }),
          createdAt: new Date(),
        });

        // Reset pending earnings to 0
        await db
          .update(readerProfiles)
          .set({
            pendingEarnings: '0.00',
            lastPayoutAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(readerProfiles.id, reader.id));

        console.log(`✓ Processed payout for ${reader.displayName}: $${pendingAmount}`);
        payoutResults.successful++;

      } catch (error) {
        console.error(`✗ Failed to process payout for ${reader.displayName}:`, error);
        payoutResults.errors.push(
          `Failed to process payout for ${reader.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        payoutResults.failed++;
      }
    }

    // Log summary
    console.log('Payout process completed:', {
      totalEligible: readersForPayout.length,
      successful: payoutResults.successful,
      failed: payoutResults.failed,
      errors: payoutResults.errors,
    });

    // Send notification email to admin if there were failures
    if (payoutResults.failed > 0) {
      // In production, you would send an email notification
      console.error('Payout failures detected:', payoutResults.errors);
    }

    return NextResponse.json({
      success: true,
      message: 'Payout process completed',
      results: {
        processed: payoutResults.successful,
        failed: payoutResults.failed,
        totalAmount: readersForPayout
          .slice(0, payoutResults.successful)
          .reduce((sum, reader) => sum + parseFloat(reader.pendingEarnings), 0),
      },
    });

  } catch (error) {
    console.error('Error in daily payout cron job:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process daily payouts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Manual trigger for testing (DELETE in production)
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  // Trigger the same logic as POST
  return POST(request);
}
