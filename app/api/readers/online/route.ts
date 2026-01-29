import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, readerProfiles } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where conditions
    const whereConditions = [
      eq(readerProfiles.isOnline, true),
      eq(readerProfiles.approvalStatus, 'approved'),
      eq(users.isActive, true),
    ];

    if (specialty) {
      // Filter by specialty if provided
      whereConditions.push(
        // This would need to be implemented with a JSON query for specialties array
      );
    }

    // Get online readers with their user information
    const onlineReaders = await db
      .select({
        id: users.id,
        displayName: readerProfiles.displayName,
        bio: readerProfiles.bio,
        specialties: readerProfiles.specialties,
        experience: readerProfiles.experience,
        rating: readerProfiles.rating,
        totalReviews: readerProfiles.totalReviews,
        profileImage: users.profileImage,
        isOnline: readerProfiles.isOnline,
        isAvailable: readerProfiles.isAvailable,
        pricing: readerProfiles.pricing,
        totalMinutes: readerProfiles.totalMinutes,
        languages: readerProfiles.languages,
      })
      .from(readerProfiles)
      .innerJoin(users, eq(readerProfiles.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(readerProfiles.rating), desc(readerProfiles.isAvailable))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(onlineReaders);
  } catch (error) {
    console.error('Error fetching online readers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
