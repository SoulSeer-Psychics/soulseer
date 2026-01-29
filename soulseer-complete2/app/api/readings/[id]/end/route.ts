import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { users, readingSessions, readerProfiles } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { endReadingSessionSchema } from '@/lib/validations';
import { processReadingPayment } from '@/lib/stripe';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = endReadingSessionSchema.parse(body);

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get reading session
    const session = await db.query.readingSessions.findFirst({
      where: and(
        eq(readingSessions.id, params.id),
        or(
          eq(readingSessions.clientId, user.id),
          eq(readingSessions.readerId, user.id)
        )
      ),
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    // Calculate session duration and cost
    const endTime = new Date();
    const startTime = session.startedAt;
    const durationInSeconds = Math.floor((endTime.getTime() - startTime!.getTime()) / 1000);
    const ratePerMinute = parseFloat(session.ratePerMinute);
    const minutes = Math.ceil(durationInSeconds / 60); // Round up to nearest minute
    const totalCost = minutes * ratePerMinute;

    // Process payment
    await processReadingPayment(
      session.clientId,
      session.readerId,
      session.id,
      totalCost,
      durationInSeconds
    );

    // Update session
    const updateData: any = {
      status: 'completed',
      endedAt: endTime,
      duration: durationInSeconds,
      totalCost: totalCost.toString(),
    };

    if (validatedData.rating) {
      updateData.clientRating = validatedData.rating;
    }

    if (validatedData.review) {
      updateData.clientReview = validatedData.review;
    }

    const [updatedSession] = await db
      .update(readingSessions)
      .set(updateData)
      .where(eq(readingSessions.id, session.id))
      .returning();

    // Update reader availability
    await db
      .update(readerProfiles)
      .set({ isAvailable: true })
      .where(eq(readerProfiles.userId, session.readerId));

    // Update reader rating if rating was provided
    if (validatedData.rating) {
      const readerProfile = await db.query.readerProfiles.findFirst({
        where: eq(readerProfiles.userId, session.readerId),
      });

      if (readerProfile) {
        const currentRating = parseFloat(readerProfile.rating);
        const currentReviews = readerProfile.totalReviews;
        const newTotalReviews = currentReviews + 1;
        const newRating = ((currentRating * currentReviews) + validatedData.rating) / newTotalReviews;

        await db
          .update(readerProfiles)
          .set({
            rating: newRating.toFixed(2),
            totalReviews: newTotalReviews,
          })
          .where(eq(readerProfiles.userId, session.readerId));
      }
    }

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error ending reading session:', error);
    
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
