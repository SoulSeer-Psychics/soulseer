import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { forumPosts, users, readerProfiles } from '@/lib/db/schema';
import { eq, and, desc, or, like, sql } from 'drizzle-orm';
import { z } from 'zod';

const postSearchSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['latest', 'popular', 'trending']).default('latest'),
  limit: z.string().optional(),
  page: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = postSearchSchema.safeParse(Object.fromEntries(searchParams));
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { category, search, sortBy, limit, page } = validation.data;

    // Build where conditions
    let whereConditions: any[] = [
      eq(forumPosts.isActive, true),
    ];

    // Category filter
    if (category) {
      whereConditions.push(eq(forumPosts.category, category));
    }

    // Search filter
    if (search) {
      whereConditions.push(
        or(
          like(forumPosts.title, `%${search}%`),
          like(forumPosts.content, `%${search}%`),
          like(forumPosts.tags, `%${search}%`)
        )!
      );
    }

    // Build the query
    let query = db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        category: forumPosts.category,
        tags: forumPosts.tags,
        isPinned: forumPosts.isPinned,
        isLocked: forumPosts.isLocked,
        views: forumPosts.views,
        replies: forumPosts.replies,
        likes: forumPosts.likes,
        lastReplyAt: forumPosts.lastReplyAt,
        lastReplyBy: forumPosts.lastReplyBy,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
        author: {
          id: users.id,
          name: sql`COALESCE(${readerProfiles.displayName}, CONCAT(${users.firstName}, ' ', COALESCE(${users.lastName}, '')))`.as('name'),
          avatar: users.profileImage,
          isReader: sql`CASE WHEN ${users.role} = 'reader' THEN true ELSE false END`.as('isReader'),
          isModerator: sql`CASE WHEN ${users.role} = 'admin' THEN true ELSE false END`.as('isModerator'),
          reputation: sql`COALESCE(${readerProfiles.rating}, 0)`.as('reputation'),
        },
      })
      .from(forumPosts)
      .innerJoin(users, eq(forumPosts.userId, users.id))
      .leftJoin(readerProfiles, eq(users.id, readerProfiles.userId))
      .where(and(...whereConditions));

    // Add sorting
    switch (sortBy) {
      case 'popular':
        query = query.orderBy(desc(forumPosts.likes), desc(forumPosts.replies));
        break;
      case 'trending':
        // Trending based on recent activity and engagement
        query = query.orderBy(
          desc(sql`(${forumPosts.likes} + ${forumPosts.replies}) / GREATEST(1, TIMESTAMPDIFF(HOUR, ${forumPosts.createdAt}, NOW()))`),
          desc(forumPosts.createdAt)
        );
        break;
      default: // latest
        query = query.orderBy(desc(forumPosts.isPinned), desc(forumPosts.lastReplyAt), desc(forumPosts.createdAt));
    }

    // Add pagination
    const pageSize = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;
    const offset = (currentPage - 1) * pageSize;
    
    query = query.limit(pageSize).offset(offset);

    const posts = await query;

    // Transform the results
    const transformedPosts = posts.map(post => ({
      ...post,
      tags: post.tags ? JSON.parse(post.tags as string) : [],
      author: {
        ...post.author,
        reputation: parseFloat(post.author.reputation as string || '0'),
      },
      lastReply: post.lastReplyAt && post.lastReplyBy ? {
        author: post.lastReplyBy,
        timestamp: post.lastReplyAt.toISOString(),
      } : null,
      // For now, assume user hasn't liked any posts (would need separate table to track)
      isLiked: false,
    }));

    return NextResponse.json(transformedPosts);
  } catch (error) {
    console.error('Error fetching posts:', error);
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
    
    const postSchema = z.object({
      title: z.string().min(1).max(200),
      content: z.string().min(1).max(10000),
      category: z.string(),
      tags: z.array(z.string()).optional(),
    });

    const validation = postSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { title, content, category, tags } = validation.data;

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if category requires reader permissions
    if (category === 'readers-only' && user.role !== 'reader' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only readers can post in this category' },
        { status: 403 }
      );
    }

    // Create the post
    const newPost = await db.insert(forumPosts).values({
      userId: user.id,
      title,
      content,
      category,
      tags: tags ? JSON.stringify(tags) : null,
      views: 0,
      replies: 0,
      likes: 0,
      isPinned: false,
      isLocked: false,
      isActive: true,
      lastReplyAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Return the post with author info
    const postWithAuthor = await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        category: forumPosts.category,
        tags: forumPosts.tags,
        isPinned: forumPosts.isPinned,
        isLocked: forumPosts.isLocked,
        views: forumPosts.views,
        replies: forumPosts.replies,
        likes: forumPosts.likes,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
        author: {
          id: users.id,
          name: sql`COALESCE(${readerProfiles.displayName}, CONCAT(${users.firstName}, ' ', COALESCE(${users.lastName}, '')))`.as('name'),
          avatar: users.profileImage,
          isReader: sql`CASE WHEN ${users.role} = 'reader' THEN true ELSE false END`.as('isReader'),
          isModerator: sql`CASE WHEN ${users.role} = 'admin' THEN true ELSE false END`.as('isModerator'),
        },
      })
      .from(forumPosts)
      .innerJoin(users, eq(forumPosts.userId, users.id))
      .leftJoin(readerProfiles, eq(users.id, readerProfiles.userId))
      .where(eq(forumPosts.id, newPost[0].id));

    const result = postWithAuthor[0];
    const transformedPost = {
      ...result,
      tags: result.tags ? JSON.parse(result.tags as string) : [],
      isLiked: false,
      lastReply: null,
    };

    return NextResponse.json(transformedPost, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
