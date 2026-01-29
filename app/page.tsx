'use client';

import React, { useState, useEffect } from 'react';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Star, 
  Users, 
  Video, 
  MessageCircle, 
  Sparkles, 
  ArrowRight, 
  Heart, 
  Clock,
  Shield,
  Zap,
  Play,
  Gift,
  TrendingUp,
  Radio,
  Phone,
  Loader2
} from 'lucide-react';
import { CosmicLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import ReaderCard from '@/components/features/reader-card';
import { formatCurrency } from '@/lib/utils';
import { useApi, useCurrentUser } from '@/lib/hooks';
import { toast } from '@/components/ui/toast';

// Types for API data
interface Reader {
  id: string;
  displayName: string;
  bio: string;
  specialties: string[];
  experience: number;
  rating: number;
  totalReviews: number;
  profileImage?: string;
  isOnline: boolean;
  isAvailable: boolean;
  pricing: { chat: number; voice: number; video: number };
  totalMinutes: number;
  languages: string[];
}

interface LiveStream {
  id: string;
  title: string;
  readerId: string;
  readerName: string;
  readerImage?: string;
  viewerCount: number;
  category?: string;
  isLive: boolean;
  scheduledAt?: string;
  startedAt?: string;
  isPrivate: boolean;
  accessPrice?: number;
}

interface PlatformStats {
  totalReaders: number;
  onlineReaders: number;
  totalSessions: number;
  avgRating: string;
  totalRevenue: number;
  activeUsers: number;
  onlineNow: string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  image?: string;
  rating: number;
  category: string;
  description?: string;
}

interface Testimonial {
  id: string;
  content: string;
  author: string;
  rating: number;
  readerId: string;
  createdAt?: string;
}

function HeroSection({ stats }: { stats?: PlatformStats }) {
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Header */}
          <h1 className="text-6xl md:text-8xl font-alex-brush text-mystical-pink-500 mb-6 mystical-glow animate-float">
            SoulSeer
          </h1>
          
          {/* Hero Image */}
          <div className="relative w-48 h-48 mx-auto mb-8">
            <div className="absolute inset-0 bg-mystical-pink-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="relative w-full h-full bg-cosmic-gradient rounded-full border-2 border-mystical-pink-500/30 flex items-center justify-center">
              <Sparkles className="w-16 h-16 text-mystical-gold-400 animate-pulse" />
            </div>
          </div>
          
          {/* Tagline */}
          <h2 className="text-2xl md:text-3xl font-playfair text-slate-200 mb-8">
            A Community of Gifted Psychics
          </h2>
          
          <p className="text-lg text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Connect with authentic spiritual advisors for guidance on love, career, and life's journey. 
            Available 24/7 for instant readings through chat, voice, or video.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/readings">
              <Button variant="default" size="xl" className="w-full sm:w-auto">
                <MessageCircle className="w-5 h-5 mr-2" />
                Start Free Reading
              </Button>
            </Link>
            <Link href="/live">
              <Button variant="secondary" size="xl" className="w-full sm:w-auto">
                <Video className="w-5 h-5 mr-2" />
                Watch Live Streams
              </Button>
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-mystical-pink-400">
                {stats ? `${Math.floor(stats.activeUsers / 1000)}k+` : '50k+'}
              </div>
              <div className="text-sm text-slate-400">Happy Clients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-mystical-gold-400">
                {stats ? stats.onlineNow : '24/7'}
              </div>
              <div className="text-sm text-slate-400">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-mystical-pink-400">
                {stats ? `${stats.totalReaders}+` : '100+'}
              </div>
              <div className="text-sm text-slate-400">Gifted Readers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-mystical-gold-400">
                {stats ? `${stats.avgRating}★` : '4.9★'}
              </div>
              <div className="text-sm text-slate-400">Average Rating</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OnlineReadersSection() {
  const { data: readers, loading, error } = useApi<Reader[]>('/api/readers/online?limit=6');

  const handleStartReading = async (readerId: string, type: 'chat' | 'voice' | 'video') => {
    try {
      window.location.href = `/readings/start?readerId=${readerId}&type=${type}`;
    } catch (error) {
      console.error('Error starting reading:', error);
      toast({
        title: 'Error',
        description: 'Failed to start reading. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleFavorite = async (readerId: string) => {
    try {
      const response = await fetch('/api/readers/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerId }),
      });
      if (!response.ok) throw new Error('Failed to favorite reader');
      toast({
        title: 'Success',
        description: 'Reader added to favorites!',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error favoriting reader:', error);
      toast({
        title: 'Error',
        description: 'Failed to add reader to favorites.',
        variant: 'destructive'
      });
    }
  };

  if (error) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-red-400">Failed to load readers. Please refresh the page.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-alex-brush text-mystical-pink-500 mb-4">
            Connect with Readers Now
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Our most talented psychics are online and ready to provide you with guidance. 
            Choose your preferred communication method and start your reading instantly.
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-mystical-pink-500" />
            <span className="ml-2 text-slate-300">Loading readers...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {readers?.map((reader) => (
                <ReaderCard
                  key={reader.id}
                  reader={reader}
                  onStartReading={handleStartReading}
                  onFavorite={handleFavorite}
                />
              )) || null}
            </div>
            
            <div className="text-center">
              <Link href="/readings">
                <Button variant="outline" size="lg">
                  View All Readers
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function LiveStreamsSection() {
  const { data: streams, loading } = useApi<LiveStream[]>('/api/streams/live?limit=4');

  return (
    <section className="py-16 bg-cosmic-900/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-alex-brush text-mystical-pink-500 mb-4">
            Live Streams & Events
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Join live sessions with our readers for group readings, educational content, and spiritual guidance. 
            Experience the energy of our community in real-time.
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-mystical-pink-500" />
            <span className="ml-2 text-slate-300">Loading streams...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {streams?.map((stream) => (
                <Card key={stream.id} variant="mystical" className="overflow-hidden group cursor-pointer hover:scale-105 transition-transform">
                  <CardContent className="p-0">
                    <div className="relative aspect-video bg-cosmic-800 flex items-center justify-center">
                      <Play className="w-12 h-12 text-mystical-gold-400" />
                      <div className="absolute top-2 right-2">
                        <Badge variant="live" className="animate-pulse">
                          <Radio className="w-3 h-3 mr-1" />
                          LIVE
                        </Badge>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="cosmic" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {stream.viewerCount}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-2 line-clamp-2">
                        {stream.title}
                      </h3>
                      <p className="text-slate-400 text-sm mb-3">
                        with {stream.readerName}
                      </p>
                      <Link href={`/live/${stream.id}`}>
                        <Button size="sm" className="w-full">
                          Join Stream
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )) || null}
              
              {/* Upcoming Stream Placeholder */}
              <Card variant="mystical" className="overflow-hidden border-dashed border-2 border-mystical-pink-500/30">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <Clock className="w-12 h-12 text-mystical-gold-400 mx-auto mb-2" />
                    <h3 className="font-semibold text-white mb-2">
                      Daily Meditation
                    </h3>
                    <p className="text-slate-400 text-sm mb-3">
                      Starting at 8:00 PM EST
                    </p>
                    <Badge variant="mystical">Scheduled</Badge>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Set Reminder
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center">
              <Link href="/live">
                <Button variant="outline" size="lg">
                  View All Streams
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function FeaturedProductsSection() {
  const { data: products, loading } = useApi<Product[]>('/api/shop/featured?limit=3');

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-alex-brush text-mystical-pink-500 mb-4">
            Spiritual Tools & Guides
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Enhance your spiritual journey with our curated collection of digital courses, 
            physical products, and exclusive content created by our expert readers.
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-mystical-pink-500" />
            <span className="ml-2 text-slate-300">Loading products...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products?.map((product) => (
              <Card key={product.id} variant="mystical" className="overflow-hidden group cursor-pointer hover:scale-105 transition-transform">
                <CardContent className="p-0">
                  <div className="aspect-square bg-cosmic-800 flex items-center justify-center">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.title}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Sparkles className="w-12 h-12 text-mystical-gold-400" />
                    )}
                  </div>
                  <div className="p-4">
                    <Badge variant="cosmic" className="mb-2 text-xs">
                      {product.category}
                    </Badge>
                    <h3 className="font-semibold text-white mb-2 line-clamp-2">
                      {product.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-mystical-gold-400 font-medium">
                        {formatCurrency(product.price)}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-mystical-gold-500 text-mystical-gold-500" />
                        <span className="text-sm text-slate-400">{product.rating}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || null}
            
            {/* More Products Placeholder */}
            <Card variant="mystical" className="overflow-hidden border-dashed border-2 border-mystical-pink-500/30">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <ArrowRight className="w-12 h-12 text-mystical-gold-400 mx-auto mb-2" />
                  <h3 className="font-semibold text-white mb-2">
                    Explore More
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Discover our full collection
                  </p>
                </div>
                <Link href="/shop">
                  <Button variant="outline" size="sm">
                    Browse Shop
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { data: testimonials } = useApi<Testimonial[]>('/api/testimonials/recent?limit=4');

  return (
    <section className="py-16 bg-cosmic-900/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-alex-brush text-mystical-pink-500 mb-4">
            What Our Clients Say
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Real experiences from people who found clarity and guidance through our platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials?.map((testimonial) => (
            <Card key={testimonial.id} variant="glass" className="p-6">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < testimonial.rating
                          ? 'fill-mystical-gold-500 text-mystical-gold-500'
                          : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-slate-300 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-mystical-pink-400 font-medium">
                    {testimonial.author}
                  </span>
                  <Heart className="w-4 h-4 text-red-500" />
                </div>
              </CardContent>
            </Card>
          )) || (
            // Fallback testimonials if API fails
            [
              {
                id: '1',
                content: 'The guidance I received was incredibly accurate and helped me navigate a difficult decision. Truly grateful for this platform.',
                author: 'Sarah M.',
                rating: 5,
              },
              {
                id: '2',
                content: 'Amazing experience! The reader was compassionate and insightful. I highly recommend SoulSeer to anyone seeking clarity.',
                author: 'Michael R.',
                rating: 5,
              }
            ].map((testimonial) => (
              <Card key={testimonial.id} variant="glass" className="p-6">
                <CardContent className="p-0">
                  <div className="flex items-center mb-4">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < testimonial.rating
                            ? 'fill-mystical-gold-500 text-mystical-gold-500'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-mystical-pink-400 font-medium">
                      {testimonial.author}
                    </span>
                    <Heart className="w-4 h-4 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function CallToActionSection() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-mystical-gradient opacity-10" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-alex-brush text-mystical-pink-500 mb-6 mystical-glow">
            Begin Your Journey
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Take the first step towards clarity and enlightenment. 
            Your spiritual guides are waiting to help illuminate your path.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link href="/sign-up">
              <Button variant="default" size="xl" className="w-full sm:w-auto">
                <Sparkles className="w-5 h-5 mr-2" />
                Get Started Free
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button variant="ghost" size="xl" className="w-full sm:w-auto">
                Learn How It Works
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-slate-400">
            ✨ First 3 minutes free for new clients • 🛡️ 100% satisfaction guarantee
          </p>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data: stats } = useApi<PlatformStats>('/api/stats/platform');
  
  return (
    <CosmicLayout>
      <div className="relative">
        <HeroSection stats={stats} />
        
        <Suspense fallback={
          <div className="py-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-mystical-pink-500" />
          </div>
        }>
          <OnlineReadersSection />
        </Suspense>
        
        <LiveStreamsSection />
        
        <FeaturedProductsSection />
        
        <TestimonialsSection />
        
        <CallToActionSection />
      </div>
    </CosmicLayout>
  );
}
