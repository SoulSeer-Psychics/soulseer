import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { users, readingSessions } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get reading session
    const session = await db.query.readingSessions.findFirst({
      where: and(
        eq(readingSessions.id, params.id),
        or(
          eq(readingSessions.clientId, user.id),
          eq(readingSessions.readerId, user.id)
        )
      ),
      with: {
        client: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        reader: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
          with: {
            readerProfile: {
              columns: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching reading session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
