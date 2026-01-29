import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { products, users, readerProfiles } from '@/lib/db/schema';
import { eq, and, desc, or, like, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';

const productSearchSchema = z.object({
  search: z.string().optional(),
  category: z.enum(['digital', 'physical', 'service']).optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  minRating: z.string().optional(),
  tags: z.string().optional(),
  sortBy: z.enum(['popularity', 'price', 'rating', 'newest']).default('popularity'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.string().optional(),
  page: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = productSearchSchema.safeParse(Object.fromEntries(searchParams));
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { 
      search, 
      category, 
      minPrice, 
      maxPrice, 
      minRating, 
      tags, 
      sortBy, 
      sortOrder,
      limit,
      page 
    } = validation.data;

    // Build where conditions
    let whereConditions: any[] = [
      eq(products.isActive, true),
    ];

    // Search filter
    if (search) {
      whereConditions.push(
        or(
          like(products.title, `%${search}%`),
          like(products.description, `%${search}%`),
          like(products.tags, `%${search}%`)
        )!
      );
    }

    // Category filter
    if (category) {
      whereConditions.push(eq(products.category, category));
    }

    // Price range filter
    if (minPrice) {
      whereConditions.push(gte(products.price, parseFloat(minPrice)));
    }
    if (maxPrice) {
      whereConditions.push(lte(products.price, parseFloat(maxPrice)));
    }

    // Rating filter
    if (minRating) {
      whereConditions.push(gte(products.rating, parseFloat(minRating)));
    }

    // Tags filter
    if (tags) {
      const tagList = tags.split(',');
      for (const tag of tagList) {
        whereConditions.push(
          sql`JSON_SEARCH(${products.tags}, 'one', ${tag.trim()}) IS NOT NULL`
        );
      }
    }

    // Build the query
    let query = db
      .select({
        id: products.id,
        title: products.title,
        description: products.description,
        price: products.price,
        originalPrice: products.originalPrice,
        category: products.category,
        type: products.type,
        images: products.images,
        rating: products.rating,
        totalReviews: products.totalReviews,
        totalSales: products.totalSales,
        isDigital: products.isDigital,
        isFeatured: products.isFeatured,
        isOnSale: products.isOnSale,
        tags: products.tags,
        createdAt: products.createdAt,
        reader: {
          id: users.id,
          displayName: readerProfiles.displayName,
          profileImage: users.profileImage,
          rating: readerProfiles.rating,
        },
      })
      .from(products)
      .leftJoin(users, eq(products.readerId, users.id))
      .leftJoin(readerProfiles, eq(users.id, readerProfiles.userId))
      .where(and(...whereConditions));

    // Add sorting
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    switch (sortBy) {
      case 'popularity':
        query = query.orderBy(sql`${products.totalSales} ${sql.raw(sortDirection)}`);
        break;
      case 'price':
        query = query.orderBy(sql`${products.price} ${sql.raw(sortDirection)}`);
        break;
      case 'rating':
        query = query.orderBy(sql`${products.rating} ${sql.raw(sortDirection)}`);
        break;
      case 'newest':
        query = query.orderBy(sql`${products.createdAt} ${sql.raw(sortDirection)}`);
        break;
      default:
        query = query.orderBy(desc(products.totalSales));
    }

    // Add pagination
    const pageSize = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;
    const offset = (currentPage - 1) * pageSize;
    
    query = query.limit(pageSize).offset(offset);

    const productList = await query;

    // Transform the results
    const transformedProducts = productList.map(product => ({
      ...product,
      images: product.images ? JSON.parse(product.images as string) : [],
      tags: product.tags ? JSON.parse(product.tags as string) : [],
      rating: parseFloat(product.rating),
      reader: product.reader ? {
        ...product.reader,
        rating: parseFloat(product.reader.rating),
      } : null,
    }));

    return NextResponse.json(transformedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
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
    
    const productSchema = z.object({
      title: z.string().min(1).max(100),
      description: z.string().min(1),
      price: z.number().min(0),
      originalPrice: z.number().optional(),
      category: z.enum(['digital', 'physical', 'service']),
      type: z.string(),
      images: z.array(z.string()).optional(),
      isDigital: z.boolean().default(false),
      tags: z.array(z.string()).optional(),
      stripeProductId: z.string().optional(),
      stripePriceId: z.string().optional(),
    });

    const validation = productSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { 
      title, 
      description, 
      price, 
      originalPrice,
      category, 
      type, 
      images, 
      isDigital, 
      tags,
      stripeProductId,
      stripePriceId
    } = validation.data;

    // Get user and verify they can create products
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      with: {
        readerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Only readers and admins can create products
    if (user.role === 'client') {
      return NextResponse.json(
        { error: 'Only readers and admins can create products' },
        { status: 403 }
      );
    }

    // Create the product
    const newProduct = await db.insert(products).values({
      readerId: user.role === 'reader' ? user.id : null,
      title,
      description,
      price: price.toFixed(2),
      originalPrice: originalPrice ? originalPrice.toFixed(2) : null,
      category,
      type,
      images: images ? JSON.stringify(images) : null,
      isDigital,
      isOnSale: originalPrice ? originalPrice > price : false,
      tags: tags ? JSON.stringify(tags) : null,
      stripeProductId,
      stripePriceId,
      rating: '0',
      totalReviews: 0,
      totalSales: 0,
      isActive: true,
      isFeatured: false,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(newProduct[0], { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
