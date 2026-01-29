import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { liveStreams, users, readerProfiles } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get live streams with reader information
    const streams = await db
      .select({
        id: liveStreams.id,
        title: liveStreams.title,
        readerId: liveStreams.readerId,
        readerName: readerProfiles.displayName,
        readerImage: users.profileImage,
        viewerCount: liveStreams.viewerCount,
        category: liveStreams.category,
        isLive: liveStreams.status,
        scheduledAt: liveStreams.scheduledAt,
        startedAt: liveStreams.startedAt,
        isPrivate: liveStreams.isPrivate,
        accessPrice: liveStreams.accessPrice,
      })
      .from(liveStreams)
      .innerJoin(users, eq(liveStreams.readerId, users.id))
      .innerJoin(readerProfiles, eq(users.id, readerProfiles.userId))
      .where(
        and(
          eq(liveStreams.status, 'live'),
          eq(users.isActive, true)
        )
      )
      .orderBy(desc(liveStreams.viewerCount), desc(liveStreams.startedAt))
      .limit(limit)
      .offset(offset);

    // Transform data for frontend
    const transformedStreams = streams.map(stream => ({
      id: stream.id,
      title: stream.title,
      readerId: stream.readerId,
      readerName: stream.readerName,
      readerImage: stream.readerImage,
      viewerCount: stream.viewerCount || 0,
      category: stream.category,
      isLive: stream.isLive === 'live',
      scheduledAt: stream.scheduledAt,
      startedAt: stream.startedAt,
      isPrivate: stream.isPrivate,
      accessPrice: stream.accessPrice,
    }));

    return NextResponse.json(transformedStreams);
  } catch (error) {
    console.error('Error fetching live streams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
