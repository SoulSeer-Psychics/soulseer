import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, readerProfiles, readingSessions, transactions } from '@/lib/db/schema';
import { eq, and, count, sum, avg, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get total readers
    const [totalReadersResult] = await db
      .select({ count: count() })
      .from(readerProfiles)
      .where(eq(readerProfiles.approvalStatus, 'approved'));

    // Get online readers count
    const [onlineReadersResult] = await db
      .select({ count: count() })
      .from(readerProfiles)
      .where(
        and(
          eq(readerProfiles.isOnline, true),
          eq(readerProfiles.approvalStatus, 'approved')
        )
      );

    // Get total completed sessions
    const [totalSessionsResult] = await db
      .select({ count: count() })
      .from(readingSessions)
      .where(eq(readingSessions.status, 'completed'));

    // Get average rating across all readers
    const [avgRatingResult] = await db
      .select({ avgRating: avg(readerProfiles.rating) })
      .from(readerProfiles)
      .where(eq(readerProfiles.approvalStatus, 'approved'));

    // Get total revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [revenueResult] = await db
      .select({ totalRevenue: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'charge'),
          eq(transactions.status, 'completed'),
          gte(transactions.createdAt, thirtyDaysAgo)
        )
      );

    // Get active users (users with sessions in last 30 days)
    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(readingSessions)
      .where(
        and(
          gte(readingSessions.startedAt, thirtyDaysAgo),
          eq(readingSessions.status, 'completed')
        )
      );

    const stats = {
      totalReaders: totalReadersResult.count || 0,
      onlineReaders: onlineReadersResult.count || 0,
      totalSessions: totalSessionsResult.count || 0,
      avgRating: avgRatingResult.avgRating ? Number(avgRatingResult.avgRating).toFixed(1) : '4.8',
      totalRevenue: revenueResult.totalRevenue || 0,
      activeUsers: activeUsersResult.count || 0,
      onlineNow: onlineReadersResult.count > 0 ? `${onlineReadersResult.count} online` : '24/7',
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
