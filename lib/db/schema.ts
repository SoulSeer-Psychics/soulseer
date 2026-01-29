import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  uuid,
  varchar,
  jsonb,
  pgEnum,
  serial,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['client', 'reader', 'admin']);
export const sessionTypeEnum = pgEnum('session_type', ['chat', 'voice', 'video']);
export const sessionStatusEnum = pgEnum('session_status', ['pending', 'active', 'completed', 'cancelled', 'disputed']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded']);
export const productTypeEnum = pgEnum('product_type', ['digital', 'physical', 'service']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']);
export const streamStatusEnum = pgEnum('stream_status', ['scheduled', 'live', 'ended', 'cancelled']);
export const giftTypeEnum = pgEnum('gift_type', ['rose', 'crystal', 'star', 'moon', 'sun', 'diamond']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'audio', 'video', 'file']);
export const notificationTypeEnum = pgEnum('notification_type', ['reading', 'payment', 'message', 'stream', 'system']);
export const disputeStatusEnum = pgEnum('dispute_status', ['open', 'investigating', 'resolved', 'closed']);

// Users table - Main user accounts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  username: varchar('username', { length: 50 }).unique(),
  role: userRoleEnum('role').notNull().default('client'),
  profileImage: text('profile_image'),
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  lastSeen: timestamp('last_seen'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  language: varchar('language', { length: 10 }).default('en'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => {
  return {
    clerkIdIdx: index('clerk_id_idx').on(table.clerkId),
    emailIdx: index('email_idx').on(table.email),
    roleIdx: index('role_idx').on(table.role),
    usernameIdx: uniqueIndex('username_idx').on(table.username),
  };
});

// Reader profiles - Additional data for psychic readers
export const readerProfiles = pgTable('reader_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  bio: text('bio'),
  specialties: jsonb('specialties'), // Array of specialties like ['tarot', 'astrology', 'palm-reading']
  experience: integer('experience'), // Years of experience
  languages: jsonb('languages'), // Spoken languages
  pricing: jsonb('pricing'), // { chat: 2.50, voice: 3.50, video: 5.00 } per minute
  availability: jsonb('availability'), // Weekly schedule
  isOnline: boolean('is_online').default(false),
  isAvailable: boolean('is_available').default(true),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  totalReviews: integer('total_reviews').default(0),
  totalMinutes: integer('total_minutes').default(0),
  totalEarnings: decimal('total_earnings', { precision: 12, scale: 2 }).default('0'),
  pendingPayout: decimal('pending_payout', { precision: 12, scale: 2 }).default('0'),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  isApproved: boolean('is_approved').default(false),
  approvedAt: timestamp('approved_at'),
  approvedBy: uuid('approved_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('reader_user_id_idx').on(table.userId),
    isOnlineIdx: index('reader_is_online_idx').on(table.isOnline),
    isAvailableIdx: index('reader_is_available_idx').on(table.isAvailable),
    ratingIdx: index('reader_rating_idx').on(table.rating),
  };
});

// Client balances for prepaid system
export const clientBalances = pgTable('client_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0'),
  pendingCharges: decimal('pending_charges', { precision: 12, scale: 2 }).default('0'),
  totalSpent: decimal('total_spent', { precision: 12, scale: 2 }).default('0'),
  autoReloadEnabled: boolean('auto_reload_enabled').default(false),
  autoReloadAmount: decimal('auto_reload_amount', { precision: 12, scale: 2 }).default('20'),
  autoReloadThreshold: decimal('auto_reload_threshold', { precision: 12, scale: 2 }).default('5'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  defaultPaymentMethodId: varchar('default_payment_method_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    userIdIdx: uniqueIndex('client_balance_user_id_idx').on(table.userId),
  };
});

// Reading sessions
export const readingSessions = pgTable('reading_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => users.id).notNull(),
  readerId: uuid('reader_id').references(() => users.id).notNull(),
  type: sessionTypeEnum('type').notNull(),
  status: sessionStatusEnum('status').default('pending'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  duration: integer('duration'), // in seconds
  ratePerMinute: decimal('rate_per_minute', { precision: 8, scale: 2 }).notNull(),
  totalCost: decimal('total_cost', { precision: 12, scale: 2 }).default('0'),
  agoraChannelName: varchar('agora_channel_name', { length: 255 }),
  agoraToken: text('agora_token'),
  ablyChannelName: varchar('ably_channel_name', { length: 255 }),
  clientRating: integer('client_rating'), // 1-5 stars
  clientReview: text('client_review'),
  readerResponse: text('reader_response'),
  tags: jsonb('tags'), // Session tags for categorization
  summary: text('summary'), // AI-generated or reader-provided summary
  transcript: text('transcript'), // Chat transcript
  isDisputed: boolean('is_disputed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    clientIdIdx: index('session_client_id_idx').on(table.clientId),
    readerIdIdx: index('session_reader_id_idx').on(table.readerId),
    statusIdx: index('session_status_idx').on(table.status),
    startedAtIdx: index('session_started_at_idx').on(table.startedAt),
    agoraChannelIdx: index('session_agora_channel_idx').on(table.agoraChannelName),
  };
});

// Session messages for chat history
export const sessionMessages = pgTable('session_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => readingSessions.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  type: messageTypeEnum('type').default('text'),
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // For file URLs, image dimensions, etc.
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    sessionIdIdx: index('message_session_id_idx').on(table.sessionId),
    senderIdIdx: index('message_sender_id_idx').on(table.senderId),
    createdAtIdx: index('message_created_at_idx').on(table.createdAt),
  };
});

// Live streams
export const liveStreams = pgTable('live_streams', {
  id: uuid('id').primaryKey().defaultRandom(),
  readerId: uuid('reader_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  status: streamStatusEnum('status').default('scheduled'),
  agoraChannelName: varchar('agora_channel_name', { length: 255 }),
  agoraToken: text('agora_token'),
  viewerCount: integer('viewer_count').default(0),
  maxViewers: integer('max_viewers').default(0),
  totalGiftsReceived: decimal('total_gifts_received', { precision: 12, scale: 2 }).default('0'),
  isPrivate: boolean('is_private').default(false),
  accessPrice: decimal('access_price', { precision: 8, scale: 2 }),
  tags: jsonb('tags'),
  thumbnail: text('thumbnail'),
  recordingUrl: text('recording_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    readerIdIdx: index('stream_reader_id_idx').on(table.readerId),
    statusIdx: index('stream_status_idx').on(table.status),
    scheduledAtIdx: index('stream_scheduled_at_idx').on(table.scheduledAt),
    agoraChannelIdx: index('stream_agora_channel_idx').on(table.agoraChannelName),
  };
});

// Stream viewers
export const streamViewers = pgTable('stream_viewers', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => liveStreams.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at'),
  totalWatchTime: integer('total_watch_time').default(0), // in seconds
}, (table) => {
  return {
    streamIdIdx: index('stream_viewer_stream_id_idx').on(table.streamId),
    userIdIdx: index('stream_viewer_user_id_idx').on(table.userId),
  };
});

// Virtual gifts
export const virtualGifts = pgTable('virtual_gifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => liveStreams.id),
  sessionId: uuid('session_id').references(() => readingSessions.id),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  receiverId: uuid('receiver_id').references(() => users.id).notNull(),
  type: giftTypeEnum('type').notNull(),
  quantity: integer('quantity').default(1),
  pricePerUnit: decimal('price_per_unit', { precision: 8, scale: 2 }).notNull(),
  totalValue: decimal('total_value', { precision: 12, scale: 2 }).notNull(),
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    streamIdIdx: index('gift_stream_id_idx').on(table.streamId),
    sessionIdIdx: index('gift_session_id_idx').on(table.sessionId),
    senderIdIdx: index('gift_sender_id_idx').on(table.senderId),
    receiverIdIdx: index('gift_receiver_id_idx').on(table.receiverId),
  };
});

// Products in marketplace
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').references(() => users.id).notNull(),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: productTypeEnum('type').notNull(),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  images: jsonb('images'), // Array of image URLs
  digitalFiles: jsonb('digital_files'), // For digital products
  inventory: integer('inventory'), // For physical products
  isActive: boolean('is_active').default(true),
  isFeatured: boolean('is_featured').default(false),
  categories: jsonb('categories'),
  tags: jsonb('tags'),
  shippingRequired: boolean('shipping_required').default(false),
  shippingCost: decimal('shipping_cost', { precision: 8, scale: 2 }),
  weight: decimal('weight', { precision: 8, scale: 2 }), // in pounds
  dimensions: jsonb('dimensions'), // {length, width, height}
  totalSales: integer('total_sales').default(0),
  totalRevenue: decimal('total_revenue', { precision: 12, scale: 2 }).default('0'),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0'),
  totalReviews: integer('total_reviews').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    sellerIdIdx: index('product_seller_id_idx').on(table.sellerId),
    typeIdx: index('product_type_idx').on(table.type),
    isActiveIdx: index('product_is_active_idx').on(table.isActive),
    isFeaturedIdx: index('product_is_featured_idx').on(table.isFeatured),
    stripeProductIdIdx: index('product_stripe_product_id_idx').on(table.stripeProductId),
  };
});

// Product reviews
export const productReviews = pgTable('product_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  rating: integer('rating').notNull(), // 1-5 stars
  title: varchar('title', { length: 255 }),
  content: text('content'),
  isVerified: boolean('is_verified').default(false), // Verified purchase
  isHelpful: integer('is_helpful').default(0), // Helpful votes
  sellerResponse: text('seller_response'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    productIdIdx: index('review_product_id_idx').on(table.productId),
    userIdIdx: index('review_user_id_idx').on(table.userId),
    ratingIdx: index('review_rating_idx').on(table.rating),
  };
});

// Orders
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  status: orderStatusEnum('status').default('pending'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 12, scale: 2 }).default('0'),
  shipping: decimal('shipping', { precision: 12, scale: 2 }).default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  shippingAddress: jsonb('shipping_address'),
  billingAddress: jsonb('billing_address'),
  trackingNumber: varchar('tracking_number', { length: 255 }),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('order_user_id_idx').on(table.userId),
    statusIdx: index('order_status_idx').on(table.status),
    stripePaymentIntentIdIdx: index('order_stripe_payment_intent_id_idx').on(table.stripePaymentIntentId),
  };
});

// Order items
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
  digitalDownloadUrl: text('digital_download_url'),
  downloadCount: integer('download_count').default(0),
  maxDownloads: integer('max_downloads').default(5),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    orderIdIdx: index('order_item_order_id_idx').on(table.orderId),
    productIdIdx: index('order_item_product_id_idx').on(table.productId),
  };
});

// Payment transactions
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  sessionId: uuid('session_id').references(() => readingSessions.id),
  orderId: uuid('order_id').references(() => orders.id),
  type: varchar('type', { length: 50 }).notNull(), // 'charge', 'refund', 'payout', 'topup'
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  status: paymentStatusEnum('status').default('pending'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
  paymentMethodId: varchar('payment_method_id', { length: 255 }),
  description: text('description'),
  metadata: jsonb('metadata'),
  failureReason: text('failure_reason'),
  processingFee: decimal('processing_fee', { precision: 8, scale: 2 }).default('0'),
  platformFee: decimal('platform_fee', { precision: 8, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('transaction_user_id_idx').on(table.userId),
    sessionIdIdx: index('transaction_session_id_idx').on(table.sessionId),
    orderIdIdx: index('transaction_order_id_idx').on(table.orderId),
    typeIdx: index('transaction_type_idx').on(table.type),
    statusIdx: index('transaction_status_idx').on(table.status),
    stripePaymentIntentIdIdx: index('transaction_stripe_payment_intent_id_idx').on(table.stripePaymentIntentId),
  };
});

// Messages between users
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  receiverId: uuid('receiver_id').references(() => users.id).notNull(),
  type: messageTypeEnum('type').default('text'),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  isPaid: boolean('is_paid').default(false), // For premium reader responses
  cost: decimal('cost', { precision: 8, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    conversationIdIdx: index('message_conversation_id_idx').on(table.conversationId),
    senderIdIdx: index('message_sender_id_idx').on(table.senderId),
    receiverIdIdx: index('message_receiver_id_idx').on(table.receiverId),
    createdAtIdx: index('message_created_at_idx').on(table.createdAt),
  };
});

// Community forum posts
export const forumPosts = pgTable('forum_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  categoryId: uuid('category_id').references(() => forumCategories.id),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  contentHtml: text('content_html'), // Rendered HTML
  isSticky: boolean('is_sticky').default(false),
  isLocked: boolean('is_locked').default(false),
  isPinned: boolean('is_pinned').default(false),
  views: integer('views').default(0),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  replyCount: integer('reply_count').default(0),
  lastReplyAt: timestamp('last_reply_at'),
  lastReplyBy: uuid('last_reply_by').references(() => users.id),
  tags: jsonb('tags'),
  images: jsonb('images'),
  isModerated: boolean('is_moderated').default(false),
  moderatedBy: uuid('moderated_by').references(() => users.id),
  moderatedAt: timestamp('moderated_at'),
  moderationReason: text('moderation_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    authorIdIdx: index('forum_post_author_id_idx').on(table.authorId),
    categoryIdIdx: index('forum_post_category_id_idx').on(table.categoryId),
    createdAtIdx: index('forum_post_created_at_idx').on(table.createdAt),
    lastReplyAtIdx: index('forum_post_last_reply_at_idx').on(table.lastReplyAt),
  };
});

// Forum categories
export const forumCategories = pgTable('forum_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  color: varchar('color', { length: 7 }).default('#ec4899'), // Hex color
  icon: varchar('icon', { length: 50 }),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  postCount: integer('post_count').default(0),
  lastPostAt: timestamp('last_post_at'),
  lastPostBy: uuid('last_post_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    slugIdx: uniqueIndex('forum_category_slug_idx').on(table.slug),
    isActiveIdx: index('forum_category_is_active_idx').on(table.isActive),
    sortOrderIdx: index('forum_category_sort_order_idx').on(table.sortOrder),
  };
});

// Forum post replies
export const forumReplies = pgTable('forum_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').references(() => forumPosts.id).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  parentReplyId: uuid('parent_reply_id'), // For nested replies
  content: text('content').notNull(),
  contentHtml: text('content_html'),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  isModerated: boolean('is_moderated').default(false),
  moderatedBy: uuid('moderated_by').references(() => users.id),
  moderatedAt: timestamp('moderated_at'),
  moderationReason: text('moderation_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    postIdIdx: index('forum_reply_post_id_idx').on(table.postId),
    authorIdIdx: index('forum_reply_author_id_idx').on(table.authorId),
    parentReplyIdIdx: index('forum_reply_parent_reply_id_idx').on(table.parentReplyId),
    createdAtIdx: index('forum_reply_created_at_idx').on(table.createdAt),
  };
});

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  data: jsonb('data'), // Additional data for the notification
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  actionUrl: text('action_url'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('notification_user_id_idx').on(table.userId),
    typeIdx: index('notification_type_idx').on(table.type),
    isReadIdx: index('notification_is_read_idx').on(table.isRead),
    createdAtIdx: index('notification_created_at_idx').on(table.createdAt),
  };
});

// User favorites (readers, products, etc.)
export const userFavorites = pgTable('user_favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  targetType: varchar('target_type', { length: 50 }).notNull(), // 'reader', 'product', 'post'
  targetId: uuid('target_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('favorite_user_id_idx').on(table.userId),
    targetIdx: index('favorite_target_idx').on(table.targetType, table.targetId),
    userTargetIdx: uniqueIndex('favorite_user_target_idx').on(table.userId, table.targetType, table.targetId),
  };
});

// Disputes
export const disputes = pgTable('disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => readingSessions.id).notNull(),
  orderId: uuid('order_id').references(() => orders.id),
  initiatorId: uuid('initiator_id').references(() => users.id).notNull(),
  respondentId: uuid('respondent_id').references(() => users.id).notNull(),
  reason: varchar('reason', { length: 100 }).notNull(),
  description: text('description').notNull(),
  status: disputeStatusEnum('status').default('open'),
  evidence: jsonb('evidence'), // URLs to uploaded evidence
  adminNotes: text('admin_notes'),
  resolution: text('resolution'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  refundAmount: decimal('refund_amount', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    sessionIdIdx: index('dispute_session_id_idx').on(table.sessionId),
    orderIdIdx: index('dispute_order_id_idx').on(table.orderId),
    initiatorIdIdx: index('dispute_initiator_id_idx').on(table.initiatorId),
    respondentIdIdx: index('dispute_respondent_id_idx').on(table.respondentId),
    statusIdx: index('dispute_status_idx').on(table.status),
    createdAtIdx: index('dispute_created_at_idx').on(table.createdAt),
  };
});

// Admin settings and configurations
export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value'),
  description: text('description'),
  isPublic: boolean('is_public').default(false),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    keyIdx: uniqueIndex('setting_key_idx').on(table.key),
    isPublicIdx: index('setting_is_public_idx').on(table.isPublic),
  };
});

// Analytics events
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: uuid('session_id'), // Browser session, not reading session
  event: varchar('event', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }),
  label: varchar('label', { length: 255 }),
  value: decimal('value', { precision: 12, scale: 2 }),
  properties: jsonb('properties'),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  referrer: text('referrer'),
  url: text('url'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('analytics_user_id_idx').on(table.userId),
    eventIdx: index('analytics_event_idx').on(table.event),
    categoryIdx: index('analytics_category_idx').on(table.category),
    createdAtIdx: index('analytics_created_at_idx').on(table.createdAt),
  };
});

// Export relations
export const usersRelations = relations(users, ({ one, many }) => ({
  readerProfile: one(readerProfiles),
  clientBalance: one(clientBalances),
  readingSessions: many(readingSessions),
  liveStreams: many(liveStreams),
  sentMessages: many(messages, { relationName: 'sentMessages' }),
  receivedMessages: many(messages, { relationName: 'receivedMessages' }),
  forumPosts: many(forumPosts),
  notifications: many(notifications),
  favorites: many(userFavorites),
  transactions: many(transactions),
  orders: many(orders),
}));

export const readerProfilesRelations = relations(readerProfiles, ({ one }) => ({
  user: one(users, { fields: [readerProfiles.userId], references: [users.id] }),
}));

export const clientBalancesRelations = relations(clientBalances, ({ one }) => ({
  user: one(users, { fields: [clientBalances.userId], references: [users.id] }),
}));

export const readingSessionsRelations = relations(readingSessions, ({ one, many }) => ({
  client: one(users, { fields: [readingSessions.clientId], references: [users.id] }),
  reader: one(users, { fields: [readingSessions.readerId], references: [users.id] }),
  messages: many(sessionMessages),
  virtualGifts: many(virtualGifts),
  transactions: many(transactions),
}));

export const liveStreamsRelations = relations(liveStreams, ({ one, many }) => ({
  reader: one(users, { fields: [liveStreams.readerId], references: [users.id] }),
  viewers: many(streamViewers),
  virtualGifts: many(virtualGifts),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(users, { fields: [products.sellerId], references: [users.id] }),
  reviews: many(productReviews),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  transactions: many(transactions),
}));

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  author: one(users, { fields: [forumPosts.authorId], references: [users.id] }),
  category: one(forumCategories, { fields: [forumPosts.categoryId], references: [forumCategories.id] }),
  replies: many(forumReplies),
}));

export const forumCategoriesRelations = relations(forumCategories, ({ many }) => ({
  posts: many(forumPosts),
}));
