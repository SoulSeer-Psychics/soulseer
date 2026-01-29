import { z } from 'zod';

// User validation schemas
export const signUpSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  timezone: z.string().optional().default('UTC'),
  language: z.string().optional().default('en'),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores').optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  profileImage: z.string().url().optional(),
});

// Reader profile validation schemas
export const readerApplicationSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(100),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(2000),
  specialties: z.array(z.string()).min(1, 'Please select at least one specialty').max(10),
  experience: z.number().int().min(0).max(50),
  languages: z.array(z.string()).min(1, 'Please select at least one language'),
  pricing: z.object({
    chat: z.number().min(0.50, 'Chat rate must be at least $0.50').max(50),
    voice: z.number().min(0.50, 'Voice rate must be at least $0.50').max(50),
    video: z.number().min(0.50, 'Video rate must be at least $0.50').max(50),
  }),
  availability: z.record(z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  })),
});

export const updateReaderProfileSchema = readerApplicationSchema.partial();

export const readerStatusSchema = z.object({
  isOnline: z.boolean(),
  isAvailable: z.boolean(),
});

// Reading session validation schemas
export const startReadingSessionSchema = z.object({
  readerId: z.string().uuid(),
  type: z.enum(['chat', 'voice', 'video']),
});

export const endReadingSessionSchema = z.object({
  sessionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5).optional(),
  review: z.string().max(1000).optional(),
});

export const rateSessionSchema = z.object({
  sessionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
});

// Message validation schemas
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  receiverId: z.string().uuid(),
  type: z.enum(['text', 'image', 'audio', 'video', 'file']).default('text'),
  content: z.string().min(1).max(5000),
  metadata: z.record(z.any()).optional(),
  isPaid: z.boolean().default(false),
  cost: z.number().min(0).optional(),
});

export const sendSessionMessageSchema = z.object({
  sessionId: z.string().uuid(),
  type: z.enum(['text', 'image', 'audio', 'video', 'file']).default('text'),
  content: z.string().min(1).max(5000),
  metadata: z.record(z.any()).optional(),
});

// Live stream validation schemas
export const createLiveStreamSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  description: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime().optional(),
  isPrivate: z.boolean().default(false),
  accessPrice: z.number().min(0).optional(),
  tags: z.array(z.string()).max(10).optional(),
  thumbnail: z.string().url().optional(),
});

export const updateLiveStreamSchema = createLiveStreamSchema.partial();

export const sendVirtualGiftSchema = z.object({
  streamId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  receiverId: z.string().uuid(),
  type: z.enum(['rose', 'crystal', 'star', 'moon', 'sun', 'diamond']),
  quantity: z.number().int().min(1).max(100).default(1),
  message: z.string().max(200).optional(),
});

// Product validation schemas
export const createProductSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters').max(255),
  description: z.string().max(5000).optional(),
  type: z.enum(['digital', 'physical', 'service']),
  price: z.number().min(0.01, 'Price must be at least $0.01'),
  currency: z.string().length(3).default('USD'),
  images: z.array(z.string().url()).max(10).optional(),
  digitalFiles: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number(),
  })).optional(),
  inventory: z.number().int().min(0).optional(),
  categories: z.array(z.string()).max(5).optional(),
  tags: z.array(z.string()).max(10).optional(),
  shippingRequired: z.boolean().default(false),
  shippingCost: z.number().min(0).optional(),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0),
  }).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(5).max(255).optional(),
  content: z.string().min(10).max(2000),
});

// Order validation schemas
export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  })).min(1),
  shippingAddress: z.object({
    name: z.string().min(2).max(100),
    line1: z.string().min(5).max(100),
    line2: z.string().max(100).optional(),
    city: z.string().min(2).max(50),
    state: z.string().min(2).max(50),
    postalCode: z.string().min(3).max(20),
    country: z.string().length(2),
  }).optional(),
  billingAddress: z.object({
    name: z.string().min(2).max(100),
    line1: z.string().min(5).max(100),
    line2: z.string().max(100).optional(),
    city: z.string().min(2).max(50),
    state: z.string().min(2).max(50),
    postalCode: z.string().min(3).max(20),
    country: z.string().length(2),
  }).optional(),
});

// Payment validation schemas
export const addFundsSchema = z.object({
  amount: z.number().min(5, 'Minimum amount is $5').max(500, 'Maximum amount is $500'),
  paymentMethodId: z.string().optional(),
  savePaymentMethod: z.boolean().default(false),
});

export const withdrawFundsSchema = z.object({
  amount: z.number().min(15, 'Minimum withdrawal is $15'),
});

export const paymentMethodSchema = z.object({
  type: z.enum(['card']),
  card: z.object({
    number: z.string().regex(/^\d{13,19}$/, 'Invalid card number'),
    expMonth: z.number().int().min(1).max(12),
    expYear: z.number().int().min(new Date().getFullYear()),
    cvc: z.string().regex(/^\d{3,4}$/, 'Invalid CVC'),
  }),
  billingDetails: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    address: z.object({
      line1: z.string().min(5).max(100),
      line2: z.string().max(100).optional(),
      city: z.string().min(2).max(50),
      state: z.string().min(2).max(50),
      postalCode: z.string().min(3).max(20),
      country: z.string().length(2),
    }),
  }),
});

// Forum validation schemas
export const createForumPostSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  content: z.string().min(10, 'Content must be at least 10 characters').max(10000),
  tags: z.array(z.string()).max(10).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const updateForumPostSchema = createForumPostSchema.partial().omit({ categoryId: true });

export const createForumReplySchema = z.object({
  postId: z.string().uuid(),
  parentReplyId: z.string().uuid().optional(),
  content: z.string().min(1, 'Content is required').max(5000),
});

export const createForumCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#ec4899'),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().default(0),
});

// Notification validation schemas
export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['reading', 'payment', 'message', 'stream', 'system']),
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(1000),
  data: z.record(z.any()).optional(),
  actionUrl: z.string().url().optional(),
});

export const updateNotificationSchema = z.object({
  isRead: z.boolean(),
});

// Dispute validation schemas
export const createDisputeSchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.string().min(5).max(100),
  description: z.string().min(20, 'Please provide more details').max(2000),
  evidence: z.array(z.string().url()).max(10).optional(),
});

export const updateDisputeSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'closed']),
  adminNotes: z.string().max(2000).optional(),
  resolution: z.string().max(2000).optional(),
  refundAmount: z.number().min(0).optional(),
});

// Favorite validation schemas
export const toggleFavoriteSchema = z.object({
  targetType: z.enum(['reader', 'product', 'post']),
  targetId: z.string().uuid(),
});

// Search and filter schemas
export const searchReadersSchema = z.object({
  query: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxPrice: z.number().min(0).optional(),
  isOnline: z.boolean().optional(),
  language: z.string().optional(),
  sortBy: z.enum(['rating', 'price', 'experience', 'reviews']).default('rating'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

export const searchProductsSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['digital', 'physical', 'service']).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  sellerId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['price', 'rating', 'sales', 'created']).default('created'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

// Admin validation schemas
export const approveReaderSchema = z.object({
  readerId: z.string().uuid(),
  approved: z.boolean(),
  notes: z.string().max(1000).optional(),
});

export const moderateContentSchema = z.object({
  contentType: z.enum(['post', 'reply', 'message', 'product']),
  contentId: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'flag']),
  reason: z.string().max(500).optional(),
});

export const updateSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

// Analytics validation schemas
export const trackEventSchema = z.object({
  event: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  label: z.string().max(255).optional(),
  value: z.number().optional(),
  properties: z.record(z.any()).optional(),
});

// File upload validation schemas
export const uploadFileSchema = z.object({
  file: z.any(),
  type: z.enum(['image', 'audio', 'video', 'document']),
  maxSize: z.number().default(50 * 1024 * 1024), // 50MB default
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Date range schema
export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// Type exports for TypeScript
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ReaderApplicationInput = z.infer<typeof readerApplicationSchema>;
export type UpdateReaderProfileInput = z.infer<typeof updateReaderProfileSchema>;
export type StartReadingSessionInput = z.infer<typeof startReadingSessionSchema>;
export type EndReadingSessionInput = z.infer<typeof endReadingSessionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateLiveStreamInput = z.infer<typeof createLiveStreamSchema>;
export type SendVirtualGiftInput = z.infer<typeof sendVirtualGiftSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddFundsInput = z.infer<typeof addFundsSchema>;
export type CreateForumPostInput = z.infer<typeof createForumPostSchema>;
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
export type SearchReadersInput = z.infer<typeof searchReadersSchema>;
export type SearchProductsInput = z.infer<typeof searchProductsSchema>;
export type TrackEventInput = z.infer<typeof trackEventSchema>;
