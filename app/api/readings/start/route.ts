import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { users, readingSessions, readerProfiles, clientBalances } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { startReadingSessionSchema } from '@/lib/validations';
import { generateChannelName } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = startReadingSessionSchema.parse(body);

    // Get client user from database
    const client = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      with: {
        clientBalance: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get reader information
    const reader = await db.query.users.findFirst({
      where: eq(users.id, validatedData.readerId),
      with: {
        readerProfile: true,
      },
    });

    if (!reader || !reader.readerProfile) {
      return NextResponse.json({ error: 'Reader not found' }, { status: 404 });
    }

    // Check if reader is available
    if (!reader.readerProfile.isOnline || !reader.readerProfile.isAvailable) {
      return NextResponse.json(
        { error: 'Reader is not available' },
        { status: 400 }
      );
    }

    // Check client balance
    const ratePerMinute = reader.readerProfile.pricing[validatedData.type as keyof typeof reader.readerProfile.pricing];
    const minBalanceRequired = ratePerMinute * 2; // Require at least 2 minutes of funds

    if (!client.clientBalance || parseFloat(client.clientBalance.balance) < minBalanceRequired) {
      return NextResponse.json(
        { error: 'Insufficient balance. Please add funds to your account.' },
        { status: 400 }
      );
    }

    // Generate channel names
    const agoraChannelName = generateChannelName('reading', client.id, reader.id);
    const ablyChannelName = `reading-session:${Date.now()}`;

    // Generate Agora token (this would be done server-side in production)
    const agoraToken = await generateAgoraTokenForSession(agoraChannelName, client.id);

    // Create reading session
    const [session] = await db
      .insert(readingSessions)
      .values({
        clientId: client.id,
        readerId: reader.id,
        type: validatedData.type,
        status: 'active',
        startedAt: new Date(),
        ratePerMinute: ratePerMinute.toString(),
        agoraChannelName,
        agoraToken,
        ablyChannelName,
      })
      .returning();

    // Update reader status to busy
    await db
      .update(readerProfiles)
      .set({ isAvailable: false })
      .where(eq(readerProfiles.userId, reader.id));

    // Return session with reader information
    return NextResponse.json({
      ...session,
      reader: {
        id: reader.id,
        displayName: reader.readerProfile.displayName,
        profileImage: reader.profileImage,
      },
      clientId: client.id,
    });
  } catch (error) {
    console.error('Error starting reading session:', error);
    
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

async function generateAgoraTokenForSession(channelName: string, userId: string): Promise<string> {
  // In a real implementation, this would call a secure server-side function
  // to generate an Agora token with the proper credentials
  // For now, return a placeholder
  return `agora_token_${channelName}_${userId}_${Date.now()}`;
}
