import { auth, currentUser } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { users, clientBalances, readerProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { User as ClerkUser } from '@clerk/nextjs/server';

export interface AuthUser {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  role: 'client' | 'reader' | 'admin';
  profileImage: string | null;
  isActive: boolean;
  isVerified: boolean;
  timezone: string;
  language: string;
  createdAt: Date | null;
  readerProfile?: any;
  clientBalance?: any;
}

/**
 * Get the current authenticated user from the database
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return null;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      with: {
        readerProfile: true,
        clientBalance: true,
      },
    });

    return user as AuthUser | null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get or create user in database after Clerk authentication
 */
export async function getOrCreateUser(clerkUser: ClerkUser): Promise<AuthUser> {
  try {
    // Try to find existing user
    let user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkUser.id),
      with: {
        readerProfile: true,
        clientBalance: true,
      },
    });

    // Create user if doesn't exist
    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          username: clerkUser.username,
          profileImage: clerkUser.imageUrl,
          role: 'client', // Default to client role
          isVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
          timezone: 'UTC',
          language: 'en',
        })
        .returning();

      // Create client balance for new user
      await db.insert(clientBalances).values({
        userId: newUser.id,
        balance: '0.00',
        totalSpent: '0.00',
      });

      // Fetch the complete user with relations
      user = await db.query.users.findFirst({
        where: eq(users.id, newUser.id),
        with: {
          readerProfile: true,
          clientBalance: true,
        },
      });
    } else {
      // Update user info from Clerk
      await db
        .update(users)
        .set({
          email: clerkUser.emailAddresses[0]?.emailAddress || user.email,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          username: clerkUser.username,
          profileImage: clerkUser.imageUrl,
          isVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
          lastSeen: new Date(),
        })
        .where(eq(users.clerkId, clerkUser.id));
    }

    return user as AuthUser;
  } catch (error) {
    console.error('Error getting or creating user:', error);
    throw new Error('Failed to get or create user');
  }
}

/**
 * Update user profile information
 */
export async function updateUserProfile(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    username?: string;
    timezone?: string;
    language?: string;
    profileImage?: string;
  }
): Promise<void> {
  try {
    await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile');
  }
}

/**
 * Check if user has required permissions
 */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;

  const permissions = {
    'read_readings': ['client', 'reader', 'admin'],
    'create_readings': ['client', 'admin'],
    'manage_readings': ['reader', 'admin'],
    'create_streams': ['reader', 'admin'],
    'manage_streams': ['reader', 'admin'],
    'moderate_content': ['admin'],
    'manage_users': ['admin'],
    'view_analytics': ['admin'],
    'manage_payments': ['admin'],
    'create_products': ['reader', 'admin'],
    'manage_products': ['reader', 'admin'],
    'access_forum': ['client', 'reader', 'admin'],
    'moderate_forum': ['admin'],
  };

  const allowedRoles = permissions[permission as keyof typeof permissions];
  return allowedRoles ? allowedRoles.includes(user.role) : false;
}

/**
 * Check if user is a reader
 */
export function isReader(user: AuthUser | null): boolean {
  return user?.role === 'reader';
}

/**
 * Check if user is an admin
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin';
}

/**
 * Check if user is a client
 */
export function isClient(user: AuthUser | null): boolean {
  return user?.role === 'client';
}

/**
 * Get user's display name
 */
export function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return 'Unknown User';
  
  if (user.readerProfile?.displayName) {
    return user.readerProfile.displayName;
  }
  
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  
  if (user.username) {
    return user.username;
  }
  
  return user.email.split('@')[0];
}

/**
 * Get user's avatar URL
 */
export function getUserAvatarUrl(user: AuthUser | null): string {
  if (!user) return '';
  
  if (user.profileImage) {
    return user.profileImage;
  }
  
  const displayName = getUserDisplayName(user);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ec4899&color=ffffff&size=200`;
}

/**
 * Check if user can access resource
 */
export async function canAccessResource(
  userId: string,
  resourceType: 'reading' | 'stream' | 'product' | 'order',
  resourceId: string
): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        readerProfile: true,
      },
    });

    if (!user) return false;

    switch (resourceType) {
      case 'reading':
        // Check if user is client or reader of the session
        const session = await db.query.readingSessions.findFirst({
          where: eq(readingSessions.id, resourceId),
        });
        return session?.clientId === userId || session?.readerId === userId;

      case 'stream':
        // Check if user is the stream creator or has access
        const stream = await db.query.liveStreams.findFirst({
          where: eq(liveStreams.id, resourceId),
        });
        return stream?.readerId === userId || !stream?.isPrivate;

      case 'product':
        // Anyone can view products, only seller can edit
        return true;

      case 'order':
        // Only order owner can access
        const order = await db.query.orders.findFirst({
          where: eq(orders.id, resourceId),
        });
        return order?.userId === userId;

      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking resource access:', error);
    return false;
  }
}

/**
 * Rate limiting for user actions
 */
const userActionLimits = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number = 60000 // 1 minute
): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  
  const current = userActionLimits.get(key);
  
  if (!current || now > current.resetTime) {
    userActionLimits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

/**
 * Log user activity
 */
export async function logUserActivity(
  userId: string,
  action: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({
      userId,
      event: action,
      category: 'user_activity',
      properties: data,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error logging user activity:', error);
  }
}

/**
 * Suspend user account
 */
export async function suspendUser(
  userId: string,
  reason: string,
  suspendedBy: string
): Promise<void> {
  try {
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await logUserActivity(suspendedBy, 'user_suspended', {
      targetUserId: userId,
      reason,
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    throw new Error('Failed to suspend user');
  }
}

/**
 * Reactivate user account
 */
export async function reactivateUser(
  userId: string,
  reactivatedBy: string
): Promise<void> {
  try {
    await db
      .update(users)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await logUserActivity(reactivatedBy, 'user_reactivated', {
      targetUserId: userId,
    });
  } catch (error) {
    console.error('Error reactivating user:', error);
    throw new Error('Failed to reactivate user');
  }
}

/**
 * Delete user account and associated data
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Delete user's reading sessions
      await tx.delete(readingSessions).where(
        or(
          eq(readingSessions.clientId, userId),
          eq(readingSessions.readerId, userId)
        )
      );

      // Delete user's products
      await tx.delete(products).where(eq(products.sellerId, userId));

      // Delete user's orders
      await tx.delete(orders).where(eq(orders.userId, userId));

      // Delete user's transactions
      await tx.delete(transactions).where(eq(transactions.userId, userId));

      // Delete user's notifications
      await tx.delete(notifications).where(eq(notifications.userId, userId));

      // Delete user's forum posts and replies
      await tx.delete(forumPosts).where(eq(forumPosts.authorId, userId));
      await tx.delete(forumReplies).where(eq(forumReplies.authorId, userId));

      // Delete reader profile if exists
      await tx.delete(readerProfiles).where(eq(readerProfiles.userId, userId));

      // Delete client balance
      await tx.delete(clientBalances).where(eq(clientBalances.userId, userId));

      // Finally delete the user
      await tx.delete(users).where(eq(users.id, userId));
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw new Error('Failed to delete user account');
  }
}

// Import required schema items
import {
  readingSessions,
  liveStreams,
  orders,
  products,
  transactions,
  notifications,
  forumPosts,
  forumReplies,
  analyticsEvents,
} from '@/lib/db/schema';
import { or } from 'drizzle-orm';
