import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { db } from '@/lib/db';
import { users, clientBalances } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    username?: string;
    created_at: number;
    updated_at: number;
    deleted?: boolean;
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headerPayload = headers();
    const svixId = headerPayload.get('svix-id');
    const svixTimestamp = headerPayload.get('svix-timestamp');
    const svixSignature = headerPayload.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    const wh = new Webhook(webhookSecret);
    let event: ClerkWebhookEvent;

    try {
      event = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event.data);
        break;
        
      case 'user.updated':
        await handleUserUpdated(event.data);
        break;
        
      case 'user.deleted':
        await handleUserDeleted(event.data);
        break;
        
      default:
        console.log(`Unhandled Clerk event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleUserCreated(userData: ClerkWebhookEvent['data']) {
  try {
    const primaryEmail = userData.email_addresses.find(
      email => email.id === userData.email_addresses[0].id
    )?.email_address;

    if (!primaryEmail) {
      console.error('No email found for user:', userData.id);
      return;
    }

    // Create user in database
    const [newUser] = await db.insert(users).values({
      clerkId: userData.id,
      email: primaryEmail,
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      profileImage: userData.image_url,
      username: userData.username,
      role: 'client', // Default role
      isActive: true,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at),
    }).returning();

    // Create client balance record for new users
    if (newUser) {
      await db.insert(clientBalances).values({
        userId: newUser.id,
        balance: '0.00',
        totalSpent: '0.00',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`User created: ${userData.id}`);
  } catch (error) {
    console.error('Error creating user:', error);
    
    // If user already exists (race condition), just log and continue
    if (error instanceof Error && error.message.includes('unique constraint')) {
      console.log(`User ${userData.id} already exists, skipping creation`);
    }
  }
}

async function handleUserUpdated(userData: ClerkWebhookEvent['data']) {
  try {
    const primaryEmail = userData.email_addresses.find(
      email => email.id === userData.email_addresses[0].id
    )?.email_address;

    if (!primaryEmail) {
      console.error('No email found for user:', userData.id);
      return;
    }

    // Update user in database
    await db
      .update(users)
      .set({
        email: primaryEmail,
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        profileImage: userData.image_url,
        username: userData.username,
        updatedAt: new Date(userData.updated_at),
      })
      .where(eq(users.clerkId, userData.id));

    console.log(`User updated: ${userData.id}`);
  } catch (error) {
    console.error('Error updating user:', error);
  }
}

async function handleUserDeleted(userData: ClerkWebhookEvent['data']) {
  try {
    // Soft delete user (mark as inactive)
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, userData.id));

    // Note: We don't hard delete users to preserve data integrity
    // and maintain historical records of transactions and sessions

    console.log(`User deleted: ${userData.id}`);
  } catch (error) {
    console.error('Error deleting user:', error);
  }
}

export const dynamic = 'force-dynamic';
