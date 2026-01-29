import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { addFundsSchema } from '@/lib/validations';
import { addFundsToClientBalance } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = addFundsSchema.parse(body);

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Process payment
    const result = await addFundsToClientBalance(
      user.id,
      validatedData.amount,
      validatedData.paymentMethodId
    );

    return NextResponse.json({
      success: true,
      paymentIntentId: result.paymentIntent.id,
      clientSecret: result.paymentIntent.client_secret,
      transactionId: result.transaction.id,
    });
  } catch (error) {
    console.error('Error adding funds:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
