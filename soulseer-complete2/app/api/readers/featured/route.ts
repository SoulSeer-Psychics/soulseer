import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, readerProfiles } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '6');

    // Get featured readers - top rated with high availability
    const featuredReaders = await db
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
        isFeatured: readerProfiles.isFeatured,
      })
      .from(users)
      .innerJoin(readerProfiles, eq(users.id, readerProfiles.userId))
      .where(
        and(
          eq(users.role, 'reader'),
          eq(users.isActive, true),
          eq(readerProfiles.isApproved, true),
          eq(readerProfiles.isFeatured, true)
        )
      )
      .orderBy(desc(readerProfiles.rating), desc(readerProfiles.totalReviews))
      .limit(limit);

    // Transform the results to match frontend expectations
    const transformedReaders = featuredReaders.map(reader => ({
      ...reader,
      specialties: reader.specialties ? JSON.parse(reader.specialties as string) : [],
      pricing: reader.pricing ? JSON.parse(reader.pricing as string) : { chat: 0, voice: 0, video: 0 },
      languages: reader.languages ? JSON.parse(reader.languages as string) : [],
      rating: parseFloat(reader.rating),
    }));

    return NextResponse.json(transformedReaders);
  } catch (error) {
    console.error('Error fetching featured readers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
