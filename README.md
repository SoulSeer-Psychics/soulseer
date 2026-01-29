# SoulSeer - Spiritual Platform

A premium platform connecting spiritual readers with clients seeking guidance. Built with Next.js 14, featuring real-time video/voice calls, live streaming, marketplace, and community forums.

## 🌟 Features

### Core Platform
- **User Management**: Role-based system (Clients, Readers, Admins)
- **Authentication**: Secure authentication with Clerk
- **Payments**: Stripe integration with automatic reader payouts
- **Real-time Communication**: Agora for video/voice, Ably for messaging

### For Clients
- **Pay-per-minute Readings**: Chat, voice, and video sessions
- **Prepaid Balance System**: Add funds, pay only for time used
- **Live Streaming**: Watch free and premium reader streams
- **Marketplace**: Buy digital courses, physical items, and services
- **Community Forum**: Connect with other spiritual seekers
- **Favorites**: Save and track preferred readers

### For Readers
- **Comprehensive Dashboard**: Earnings, sessions, client management
- **Flexible Pricing**: Set individual rates for chat/voice/video
- **Live Streaming**: Host free and premium streams with virtual gifts
- **Product Creation**: Sell digital and physical products
- **Availability Management**: Online/offline status control
- **Automatic Payouts**: Daily payouts for balances over $15

### For Administrators
- **User Management**: Approve readers, manage accounts
- **Content Moderation**: Review posts, handle disputes
- **Analytics Dashboard**: Revenue tracking, user metrics
- **Platform Oversight**: Monitor sessions, handle support

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: Neon PostgreSQL
- **Authentication**: Clerk
- **Payments**: Stripe Connect
- **Real-time**: Agora (video/voice), Ably (messaging)
- **Deployment**: Vercel
- **UI Components**: Custom mystical-themed component library

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- Clerk account
- Stripe account with Connect
- Agora account
- Ably account

### Environment Setup
1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Configure all environment variables:
   - Database connection
   - Clerk authentication keys
   - Stripe API keys and webhook secrets
   - Agora App ID and certificate
   - Ably API keys

### Installation
```bash
npm install
npm run db:push  # Set up database schema
npm run dev      # Start development server
```

### Database Setup
The application includes a complete database schema with 19 tables covering:
- User management and profiles
- Reading sessions and transactions
- Live streaming and chat
- Marketplace products and orders
- Community forum posts and replies
- Payment processing and payouts

### Payment Configuration
1. Set up Stripe Connect for reader payouts
2. Configure webhook endpoints for payment processing
3. Test payment flows in Stripe's test mode
4. Set up daily payout cron job

## 📱 Mobile Support

The application is built mobile-first with:
- Responsive design for all screen sizes
- Touch-optimized interfaces
- PWA capabilities for app-like experience
- Optimized for iOS and Android browsers

## 🔐 Security Features

- End-to-end encryption for all communications
- Secure payment processing with PCI compliance
- Rate limiting on all API endpoints
- Input validation and sanitization
- CSRF protection
- Secure session management

## 💰 Business Model

- **70/30 Revenue Split**: Readers keep 70%, platform takes 30%
- **Minimum Payout**: $15 daily automatic payouts
- **Per-minute Billing**: Clients only pay for time used
- **Multiple Revenue Streams**:
  - Reading session fees
  - Marketplace commissions
  - Premium stream subscriptions
  - Virtual gift purchases

## 🎨 Design System

### Mystical Theme
- **Colors**: Pink, black, gold, white accents
- **Typography**: Alex Brush (headings), Playfair Display (body)
- **Animations**: Cosmic elements, subtle mystical effects
- **Components**: Fully customized UI with mystical variants

### Brand Elements
- Celestial and cosmic design patterns
- Mystical glow effects
- Smooth animations and transitions
- Spiritual iconography throughout

## 📊 Analytics & Monitoring

- User engagement tracking
- Session duration and conversion metrics
- Revenue analytics and forecasting
- Reader performance indicators
- Platform health monitoring

## 🔄 Real-time Features

### Reading Sessions
- Live video/audio with Agora
- Real-time chat with Ably
- Session timer and billing
- Connection quality monitoring

### Live Streaming
- High-quality video streaming
- Interactive chat overlay
- Virtual gift animations
- Viewer count tracking

### Community
- Real-time forum updates
- Live chat in streams
- Instant notifications
- Presence indicators

## 🧪 Testing

The application includes comprehensive testing for:
- User authentication flows
- Payment processing
- Reading session management
- Real-time communication
- Database operations

## 🚢 Deployment

### Production Deployment
1. Set up production environment variables
2. Configure Stripe webhooks for production
3. Set up Agora and Ably for production
4. Deploy to Vercel with automatic deployments
5. Configure custom domain and SSL

### Monitoring
- Error tracking with Sentry (optional)
- Performance monitoring
- Database monitoring
- Payment processing alerts
- User support system

## 📚 API Documentation

The application includes extensive API endpoints:

### Authentication
- `/api/auth/*` - User authentication and management

### Payments
- `/api/payments/*` - Balance management and transactions
- `/api/stripe/webhook` - Stripe webhook handling

### Readings
- `/api/readings/*` - Session management and billing

### Live Streaming
- `/api/live/*` - Stream creation and management

### Marketplace
- `/api/shop/*` - Product and order management

### Community
- `/api/community/*` - Forum posts and interactions

### Administration
- `/api/admin/*` - Platform management and analytics

## 🔧 Configuration

### Feature Flags
The application supports feature flags for:
- Live streaming functionality
- Virtual gifts system
- Marketplace features
- Community forums

### Customization
- Brand colors and themes
- Payment processing settings
- Reader approval workflows
- Content moderation rules

## 📞 Support

For technical support or business inquiries:
- Documentation: Available in `/docs` folder
- Issue tracking: GitHub Issues
- Business contact: Through platform admin

## 📄 License

This is a commercial application. All rights reserved.

---

**SoulSeer** - Connecting souls through spiritual guidance. Built for the modern age of digital spirituality.
