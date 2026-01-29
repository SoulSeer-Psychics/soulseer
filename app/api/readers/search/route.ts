import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, readerProfiles } from '@/lib/db/schema';
import { eq, and, gte, lte, like, or, desc, asc, sql, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search') || '';
    const specialties = searchParams.get('specialties')?.split(',').filter(Boolean) || [];
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '1000');
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const availability = searchParams.get('availability') || 'all';
    const minExperience = parseInt(searchParams.get('minExperience') || '0');
    const languages = searchParams.get('languages')?.split(',').filter(Boolean) || [];
    const sortBy = searchParams.get('sortBy') || 'rating';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Start building the query
    let whereConditions = [
      eq(users.role, 'reader'),
      eq(users.isActive, true),
      eq(readerProfiles.isApproved, true),
    ];

    // Search filter
    if (search) {
      whereConditions.push(
        or(
          like(readerProfiles.displayName, `%${search}%`),
          like(readerProfiles.bio, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`)
        )!
      );
    }

    // Rating filter
    if (minRating > 0) {
      whereConditions.push(gte(readerProfiles.rating, minRating.toString()));
    }

    // Experience filter
    if (minExperience > 0) {
      whereConditions.push(gte(readerProfiles.experience, minExperience));
    }

    // Availability filter
    if (availability === 'online') {
      whereConditions.push(eq(readerProfiles.isOnline, true));
    } else if (availability === 'available') {
      whereConditions.push(
        and(
          eq(readerProfiles.isOnline, true),
          eq(readerProfiles.isAvailable, true)
        )!
      );
    }

    // Price filter - check against all pricing tiers
    if (minPrice > 0 || maxPrice < 1000) {
      whereConditions.push(
        or(
          and(
            gte(sql`CAST(${readerProfiles.pricing}->>'chat' AS DECIMAL)`, minPrice),
            lte(sql`CAST(${readerProfiles.pricing}->>'chat' AS DECIMAL)`, maxPrice)
          ),
          and(
            gte(sql`CAST(${readerProfiles.pricing}->>'voice' AS DECIMAL)`, minPrice),
            lte(sql`CAST(${readerProfiles.pricing}->>'voice' AS DECIMAL)`, maxPrice)
          ),
          and(
            gte(sql`CAST(${readerProfiles.pricing}->>'video' AS DECIMAL)`, minPrice),
            lte(sql`CAST(${readerProfiles.pricing}->>'video' AS DECIMAL)`, maxPrice)
          )
        )!
      );
    }

    // Build the main query
    let query = db
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
        createdAt: readerProfiles.createdAt,
      })
      .from(users)
      .innerJoin(readerProfiles, eq(users.id, readerProfiles.userId))
      .where(and(...whereConditions));

    // Add specialty filter using JSON operations
    if (specialties.length > 0) {
      for (const specialty of specialties) {
        query = query.where(
          sql`JSON_SEARCH(${readerProfiles.specialties}, 'one', ${specialty}) IS NOT NULL`
        );
      }
    }

    // Add language filter
    if (languages.length > 0) {
      for (const language of languages) {
        query = query.where(
          sql`JSON_SEARCH(${readerProfiles.languages}, 'one', ${language}) IS NOT NULL`
        );
      }
    }

    // Add sorting
    const sortDirection = sortOrder === 'asc' ? asc : desc;
    
    switch (sortBy) {
      case 'rating':
        query = query.orderBy(sortDirection(readerProfiles.rating));
        break;
      case 'price':
        // Sort by chat price as default
        query = query.orderBy(sortDirection(sql`CAST(${readerProfiles.pricing}->>'chat' AS DECIMAL)`));
        break;
      case 'experience':
        query = query.orderBy(sortDirection(readerProfiles.experience));
        break;
      case 'reviews':
        query = query.orderBy(sortDirection(readerProfiles.totalReviews));
        break;
      default:
        query = query.orderBy(desc(readerProfiles.rating));
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    // Execute query
    const readers = await query;

    // Transform the results to match frontend expectations
    const transformedReaders = readers.map(reader => ({
      ...reader,
      specialties: reader.specialties ? JSON.parse(reader.specialties as string) : [],
      pricing: reader.pricing ? JSON.parse(reader.pricing as string) : { chat: 0, voice: 0, video: 0 },
      languages: reader.languages ? JSON.parse(reader.languages as string) : [],
      rating: parseFloat(reader.rating),
    }));

    // Get total count for pagination (simplified for performance)
    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .innerJoin(readerProfiles, eq(users.id, readerProfiles.userId))
      .where(and(...whereConditions));

    const totalResult = await totalQuery;
    const total = totalResult[0]?.count || 0;

    return NextResponse.json({
      readers: transformedReaders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error searching readers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
