import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { users, readerProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { hasPermission } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const createReaderSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  displayName: z.string().min(1),
  bio: z.string().min(10),
  specialties: z.array(z.string()).min(1),
  experience: z.number().min(0),
  languages: z.array(z.string()).min(1),
  pricing: z.object({
    chat: z.number().min(0.5).max(50),
    voice: z.number().min(0.5).max(50),
    video: z.number().min(0.5).max(50),
  }),
  timeZone: z.string(),
  profileImage: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!currentUser || !hasPermission(currentUser.role, 'admin', 'create_reader')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createReaderSchema.parse(body);

    // Check if user already exists in Clerk
    const existingClerkUsers = await clerkClient.users.getUserList({
      emailAddress: [validatedData.email],
    });

    let clerkUser;
    if (existingClerkUsers.length > 0) {
      clerkUser = existingClerkUsers[0];
      
      // Check if already exists in our database
      const existingUser = await db.query.users.findFirst({
        where: eq(users.clerkId, clerkUser.id),
      });
      
      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists' },
          { status: 400 }
        );
      }
    } else {
      // Create new user in Clerk
      clerkUser = await clerkClient.users.createUser({
        emailAddress: [validatedData.email],
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        password: Math.random().toString(36).slice(-12), // Temporary password
      });
    }

    // Create Stripe Connect account for the reader
    const stripeAccount = await stripe.accounts.create({
      type: 'express',
      email: validatedData.email,
      business_type: 'individual',
      individual: {
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        email: validatedData.email,
      },
      business_profile: {
        mcc: '7299', // Miscellaneous Personal Services
        product_description: 'Spiritual guidance and psychic reading services',
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'daily',
            delay_days: 2,
          },
        },
      },
    });

    // Create user in our database
    const [newUser] = await db.insert(users).values({
      clerkId: clerkUser.id,
      email: validatedData.email,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      profileImage: validatedData.profileImage,
      role: 'reader',
      isActive: true,
      createdAt: new Date(),
    }).returning();

    // Create reader profile
    const [readerProfile] = await db.insert(readerProfiles).values({
      userId: newUser.id,
      displayName: validatedData.displayName,
      bio: validatedData.bio,
      specialties: JSON.stringify(validatedData.specialties),
      experience: validatedData.experience,
      languages: JSON.stringify(validatedData.languages),
      pricing: JSON.stringify(validatedData.pricing),
      timeZone: validatedData.timeZone,
      stripeAccountId: stripeAccount.id,
      stripeAccountStatus: 'pending',
      isApproved: true, // Auto-approve admin-created readers
      isFeatured: false,
      isOnline: false,
      isAvailable: false,
      rating: '0',
      totalReviews: 0,
      totalMinutes: 0,
      totalEarnings: '0.00',
      pendingEarnings: '0.00',
      createdAt: new Date(),
    }).returning();

    // Generate Stripe account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/reader/onboarding/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/reader/onboarding/complete`,
      type: 'account_onboarding',
    });

    // Send invitation email to the new reader
    await clerkClient.invitations.createInvitation({
      emailAddress: validatedData.email,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reader/onboarding?account=${stripeAccount.id}`,
    });

    return NextResponse.json({
      success: true,
      reader: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        displayName: readerProfile.displayName,
        stripeAccountId: stripeAccount.id,
        onboardingUrl: accountLink.url,
      },
    });
  } catch (error) {
    console.error('Error creating reader:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get all readers for admin management
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!currentUser || !hasPermission(currentUser.role, 'admin', 'read_readers')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // 'active', 'inactive', 'pending'
    const search = searchParams.get('search') || '';

    // Build query conditions
    let whereConditions = [eq(users.role, 'reader')];

    if (status === 'active') {
      whereConditions.push(eq(users.isActive, true));
    } else if (status === 'inactive') {
      whereConditions.push(eq(users.isActive, false));
    }

    // Get readers with pagination
    const offset = (page - 1) * limit;
    
    const readers = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImage: users.profileImage,
        isActive: users.isActive,
        createdAt: users.createdAt,
        displayName: readerProfiles.displayName,
        bio: readerProfiles.bio,
        specialties: readerProfiles.specialties,
        experience: readerProfiles.experience,
        rating: readerProfiles.rating,
        totalReviews: readerProfiles.totalReviews,
        totalMinutes: readerProfiles.totalMinutes,
        totalEarnings: readerProfiles.totalEarnings,
        isOnline: readerProfiles.isOnline,
        isAvailable: readerProfiles.isAvailable,
        isApproved: readerProfiles.isApproved,
        isFeatured: readerProfiles.isFeatured,
        stripeAccountId: readerProfiles.stripeAccountId,
        stripeAccountStatus: readerProfiles.stripeAccountStatus,
        lastActiveAt: readerProfiles.lastActiveAt,
      })
      .from(users)
      .leftJoin(readerProfiles, eq(users.id, readerProfiles.userId))
      .limit(limit)
      .offset(offset);

    // Transform results
    const transformedReaders = readers.map(reader => ({
      ...reader,
      specialties: reader.specialties ? JSON.parse(reader.specialties as string) : [],
      rating: parseFloat(reader.rating || '0'),
    }));

    return NextResponse.json({
      readers: transformedReaders,
      pagination: {
        page,
        limit,
        total: readers.length, // This is simplified - in production, you'd do a separate count query
      },
    });
  } catch (error) {
    console.error('Error fetching readers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
