import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  users, 
  readerProfiles, 
  readingSessions,
  reviews 
} from '@/lib/db/schema';
import { eq, and, desc, avg, count } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const readerId = params.id;

    // Get reader details
    const reader = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImage: users.profileImage,
        displayName: readerProfiles.displayName,
        bio: readerProfiles.bio,
        specialties: readerProfiles.specialties,
        experience: readerProfiles.experience,
        rating: readerProfiles.rating,
        totalReviews: readerProfiles.totalReviews,
        isOnline: readerProfiles.isOnline,
        isAvailable: readerProfiles.isAvailable,
        pricing: readerProfiles.pricing,
        totalMinutes: readerProfiles.totalMinutes,
        languages: readerProfiles.languages,
        timeZone: readerProfiles.timeZone,
        joinedAt: users.createdAt,
        lastActiveAt: readerProfiles.lastActiveAt,
      })
      .from(users)
      .innerJoin(readerProfiles, eq(users.id, readerProfiles.userId))
      .where(
        and(
          eq(users.id, readerId),
          eq(users.role, 'reader'),
          eq(users.isActive, true),
          eq(readerProfiles.isApproved, true)
        )
      )
      .limit(1);

    if (reader.length === 0) {
      return NextResponse.json(
        { error: 'Reader not found' },
        { status: 404 }
      );
    }

    const readerData = reader[0];

    // Get recent reviews
    const recentReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        clientName: users.firstName,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.clientId, users.id))
      .where(eq(reviews.readerId, readerId))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    // Get session stats
    const sessionStats = await db
      .select({
        totalSessions: count(),
        avgDuration: avg(readingSessions.duration),
      })
      .from(readingSessions)
      .where(
        and(
          eq(readingSessions.readerId, readerId),
          eq(readingSessions.status, 'completed')
        )
      );

    // Transform the result
    const transformedReader = {
      ...readerData,
      specialties: readerData.specialties ? JSON.parse(readerData.specialties as string) : [],
      pricing: readerData.pricing ? JSON.parse(readerData.pricing as string) : { chat: 0, voice: 0, video: 0 },
      languages: readerData.languages ? JSON.parse(readerData.languages as string) : [],
      rating: parseFloat(readerData.rating),
      recentReviews: recentReviews.map(review => ({
        ...review,
        rating: parseInt(review.rating),
      })),
      stats: {
        totalSessions: sessionStats[0]?.totalSessions || 0,
        averageDuration: sessionStats[0]?.avgDuration || 0,
        totalHours: Math.floor((readerData.totalMinutes || 0) / 60),
      },
    };

    return NextResponse.json(transformedReader);
  } catch (error) {
    console.error('Error fetching reader details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
