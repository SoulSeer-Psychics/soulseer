import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { liveStreams, users, readerProfiles } from '@/lib/db/schema';
import { eq, and, desc, or, like, gte } from 'drizzle-orm';
import { z } from 'zod';

const streamSearchSchema = z.object({
  status: z.enum(['live', 'scheduled', 'ended']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  featured: z.string().optional(),
  limit: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = streamSearchSchema.safeParse(Object.fromEntries(searchParams));
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { status, category, search, featured, limit } = validation.data;

    // Build where conditions
    let whereConditions: any[] = [];

    // Filter by status
    if (status) {
      switch (status) {
        case 'live':
          whereConditions.push(eq(liveStreams.isLive, true));
          break;
        case 'scheduled':
          whereConditions.push(
            and(
              eq(liveStreams.isLive, false),
              gte(liveStreams.scheduledFor, new Date().toISOString())
            )!
          );
          break;
        case 'ended':
          whereConditions.push(eq(liveStreams.status, 'ended'));
          break;
      }
    }

    // Filter by category
    if (category) {
      whereConditions.push(eq(liveStreams.category, category));
    }

    // Filter by featured status
    if (featured === 'true') {
      whereConditions.push(eq(liveStreams.isFeatured, true));
    }

    // Search filter
    if (search) {
      whereConditions.push(
        or(
          like(liveStreams.title, `%${search}%`),
          like(liveStreams.description, `%${search}%`)
        )!
      );
    }

    // Build the query
    let query = db
      .select({
        id: liveStreams.id,
        title: liveStreams.title,
        description: liveStreams.description,
        category: liveStreams.category,
        isLive: liveStreams.isLive,
        isPrivate: liveStreams.isPrivate,
        isPremium: liveStreams.isPremium,
        price: liveStreams.price,
        viewerCount: liveStreams.viewerCount,
        scheduledFor: liveStreams.scheduledFor,
        startedAt: liveStreams.startedAt,
        thumbnail: liveStreams.thumbnail,
        agoraChannelName: liveStreams.agoraChannelName,
        agoraToken: liveStreams.agoraToken,
        createdAt: liveStreams.createdAt,
        reader: {
          id: users.id,
          displayName: readerProfiles.displayName,
          profileImage: users.profileImage,
          rating: readerProfiles.rating,
          specialties: readerProfiles.specialties,
        },
      })
      .from(liveStreams)
      .innerJoin(users, eq(liveStreams.readerId, users.id))
      .innerJoin(readerProfiles, eq(users.id, readerProfiles.userId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(liveStreams.createdAt));

    // Apply limit
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const streams = await query;

    // Transform the results
    const transformedStreams = streams.map(stream => ({
      ...stream,
      reader: {
        ...stream.reader,
        specialties: stream.reader.specialties 
          ? JSON.parse(stream.reader.specialties as string) 
          : [],
        rating: parseFloat(stream.reader.rating),
      },
    }));

    return NextResponse.json(transformedStreams);
  } catch (error) {
    console.error('Error fetching streams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const streamSchema = z.object({
      title: z.string().min(1).max(100),
      description: z.string().optional(),
      category: z.string(),
      scheduledFor: z.string().optional(),
      isPrivate: z.boolean().default(false),
      isPremium: z.boolean().default(false),
      price: z.number().optional(),
    });

    const validation = streamSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { title, description, category, scheduledFor, isPrivate, isPremium, price } = validation.data;

    // Verify user is a reader
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      with: {
        readerProfile: true,
      },
    });

    if (!user || user.role !== 'reader' || !user.readerProfile?.isApproved) {
      return NextResponse.json(
        { error: 'Only approved readers can create streams' },
        { status: 403 }
      );
    }

    // Generate Agora channel name and token
    const channelName = `stream_${user.id}_${Date.now()}`;
    // In production, you would generate a proper Agora token
    const agoraToken = `temp_token_${channelName}`;

    // Create the stream
    const newStream = await db.insert(liveStreams).values({
      readerId: user.id,
      title,
      description: description || '',
      category,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      isPrivate,
      isPremium,
      price: isPremium ? price : null,
      agoraChannelName: channelName,
      agoraToken,
      status: scheduledFor ? 'scheduled' : 'created',
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(newStream[0], { status: 201 });
  } catch (error) {
    console.error('Error creating stream:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
