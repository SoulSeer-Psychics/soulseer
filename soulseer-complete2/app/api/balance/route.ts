import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { clientBalances, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get client balance
    const balance = await db.query.clientBalances.findFirst({
      where: eq(clientBalances.userId, user.id),
    });

    if (!balance) {
      // Create initial balance if doesn't exist
      const [newBalance] = await db
        .insert(clientBalances)
        .values({
          userId: user.id,
          balance: '0.00',
          totalSpent: '0.00',
        })
        .returning();
      
      return NextResponse.json(newBalance);
    }

    return NextResponse.json(balance);
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
