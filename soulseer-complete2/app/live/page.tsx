import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Radio, 
  Users, 
  Clock, 
  Calendar, 
  Play, 
  Heart,
  Gift,
  MessageSquare,
  Filter,
  Search,
  Sparkles,
  Eye,
  Star
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime, formatCurrency } from '@/lib/utils';
import { useApi } from '@/lib/hooks';

interface LiveStream {
  id: string;
  title: string;
  description: string;
  reader: {
    id: string;
    displayName: string;
    profileImage?: string;
    rating: number;
    specialties: string[];
  };
  viewerCount: number;
  isLive: boolean;
  scheduledFor?: string;
  startedAt?: string;
  thumbnail?: string;
  category: string;
  isPrivate: boolean;
  isPremium: boolean;
  price?: number;
}

const CATEGORIES = [
  'All',
  'Tarot Readings',
  'Astrology',
  'Love & Relationships',
  'Career Guidance',
  'Spiritual Healing',
  'Meditation',
  'Q&A Sessions',
  'Educational'
];

export default function LiveStreamsPage() {
  const [activeTab, setActiveTab] = useState<'live' | 'scheduled'>('live');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: liveStreams, loading: liveLoading } = useApi<LiveStream[]>(
    '/api/live/streams?status=live'
  );

  const { data: scheduledStreams, loading: scheduledLoading } = useApi<LiveStream[]>(
    '/api/live/streams?status=scheduled'
  );

  const { data: featuredStreams } = useApi<LiveStream[]>(
    '/api/live/streams?featured=true&limit=3'
  );

  // Filter streams based on search and category
  const filterStreams = (streams: LiveStream[] | undefined) => {
    if (!streams) return [];
    
    return streams.filter(stream => {
      const matchesSearch = searchQuery === '' || 
        stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stream.reader.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || 
        stream.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  };

  const filteredLiveStreams = filterStreams(liveStreams);
  const filteredScheduledStreams = filterStreams(scheduledStreams);

  const handleJoinStream = (streamId: string) => {
    window.location.href = `/live/${streamId}`;
  };

  const handleSetReminder = (streamId: string) => {
    // Handle reminder logic
    console.log('Set reminder for stream:', streamId);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-alex-brush text-mystical-pink-500 mb-4 mystical-glow">
            Live Spiritual Sessions
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Join live sessions with our gifted readers for free insights, community discussions, and spiritual guidance.
          </p>
        </div>

        {/* Featured Streams */}
        {featuredStreams && featuredStreams.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-alex-brush text-mystical-pink-500 mb-6 text-center">
              Featured Sessions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredStreams.map((stream) => (
                <Card key={stream.id} variant="cosmic" glow className="overflow-hidden group cursor-pointer">
                  <CardContent className="p-0">
                    <div className="relative">
                      <div className="aspect-video bg-cosmic-800 flex items-center justify-center relative overflow-hidden">
                        {stream.thumbnail ? (
                          <img 
                            src={stream.thumbnail} 
                            alt={stream.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="bg-mystical-gradient opacity-50 absolute inset-0" />
                        )}
                        <div className="absolute inset-0 bg-black/20" />
                        <Play className="absolute w-16 h-16 text-white/80 group-hover:scale-110 transition-transform" />
                        
                        {/* Stream Status */}
                        <div className="absolute top-3 left-3">
                          {stream.isLive ? (
                            <Badge variant="live" className="animate-pulse">
                              <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                              LIVE
                            </Badge>
                          ) : (
                            <Badge variant="cosmic">
                              <Clock className="w-3 h-3 mr-1" />
                              Scheduled
                            </Badge>
                          )}
                        </div>

                        {/* Viewer Count */}
                        {stream.isLive && (
                          <div className="absolute top-3 right-3">
                            <Badge variant="dark">
                              <Eye className="w-3 h-3 mr-1" />
                              {stream.viewerCount}
                            </Badge>
                          </div>
                        )}

                        {/* Premium Badge */}
                        {stream.isPremium && (
                          <div className="absolute bottom-3 right-3">
                            <Badge variant="gold">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-2 line-clamp-2">
                        {stream.title}
                      </h3>
                      
                      <div className="flex items-center space-x-2 mb-3">
                        <Avatar size="sm">
                          <AvatarImage src={stream.reader.profileImage} />
                          <AvatarFallback>
                            {stream.reader.displayName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm text-mystical-pink-400 font-medium">
                            {stream.reader.displayName}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-mystical-gold-500 text-mystical-gold-500" />
                            <span className="text-xs text-slate-400">
                              {stream.reader.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="mystical" className="text-xs">
                          {stream.category}
                        </Badge>
                        
                        <Button
                          size="sm"
                          onClick={() => handleJoinStream(stream.id)}
                          variant={stream.isLive ? 'default' : 'outline'}
                        >
                          {stream.isLive ? 'Join Now' : 'Set Reminder'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <Card variant="mystical" className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Search */}
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    variant="mystical"
                    placeholder="Search streams by title or reader..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-800 rounded-lg p-1 inline-flex">
            <Button
              variant={activeTab === 'live' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('live')}
              className="rounded-md"
            >
              <Radio className="w-4 h-4 mr-2" />
              Live Now ({filteredLiveStreams.length})
            </Button>
            <Button
              variant={activeTab === 'scheduled' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('scheduled')}
              className="rounded-md"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Scheduled ({filteredScheduledStreams.length})
            </Button>
          </div>
        </div>

        {/* Stream Grid */}
        <div>
          {activeTab === 'live' ? (
            liveLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} variant="mystical" className="overflow-hidden">
                    <CardContent className="p-0">
                      <Skeleton className="aspect-video w-full" />
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex items-center space-x-2">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredLiveStreams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLiveStreams.map((stream) => (
                  <StreamCard 
                    key={stream.id} 
                    stream={stream} 
                    onJoin={handleJoinStream}
                    onSetReminder={handleSetReminder}
                  />
                ))}
              </div>
            ) : (
              <Card variant="mystical">
                <CardContent className="p-12 text-center">
                  <Radio className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-4">No Live Streams</h3>
                  <p className="text-slate-400 mb-6">
                    {searchQuery || selectedCategory !== 'All' 
                      ? 'No streams match your search criteria.' 
                      : 'No readers are currently streaming. Check back later for live sessions.'}
                  </p>
                  {(searchQuery || selectedCategory !== 'All') && (
                    <Button 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }} 
                      variant="outline"
                    >
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          ) : (
            scheduledLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} variant="mystical" className="overflow-hidden">
                    <CardContent className="p-0">
                      <Skeleton className="aspect-video w-full" />
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex items-center space-x-2">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredScheduledStreams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredScheduledStreams.map((stream) => (
                  <StreamCard 
                    key={stream.id} 
                    stream={stream} 
                    onJoin={handleJoinStream}
                    onSetReminder={handleSetReminder}
                  />
                ))}
              </div>
            ) : (
              <Card variant="mystical">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-4">No Scheduled Streams</h3>
                  <p className="text-slate-400 mb-6">
                    {searchQuery || selectedCategory !== 'All' 
                      ? 'No scheduled streams match your search criteria.' 
                      : 'No upcoming streams scheduled. Check back later for new sessions.'}
                  </p>
                  {(searchQuery || selectedCategory !== 'All') && (
                    <Button 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }} 
                      variant="outline"
                    >
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Create Stream CTA for Readers */}
        <div className="mt-16 text-center">
          <Card variant="cosmic" className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <Sparkles className="w-16 h-16 text-mystical-gold-500 mx-auto mb-4" />
              <h3 className="text-2xl font-alex-brush text-mystical-pink-500 mb-4">
                Share Your Gifts
              </h3>
              <p className="text-slate-300 mb-6">
                Are you a spiritual reader? Connect with our community through live streaming and share your wisdom with seekers around the world.
              </p>
              <Link href="/reader/apply">
                <Button variant="default" size="lg">
                  Become a Reader
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function StreamCard({ 
  stream, 
  onJoin, 
  onSetReminder 
}: { 
  stream: LiveStream; 
  onJoin: (id: string) => void; 
  onSetReminder: (id: string) => void; 
}) {
  return (
    <Card variant="mystical" className="overflow-hidden group cursor-pointer hover:scale-105 transition-transform">
      <CardContent className="p-0">
        <div className="relative">
          <div className="aspect-video bg-cosmic-800 flex items-center justify-center relative overflow-hidden">
            {stream.thumbnail ? (
              <img 
                src={stream.thumbnail} 
                alt={stream.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="bg-mystical-gradient opacity-30 absolute inset-0" />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
            
            {/* Play Button */}
            <Play className="absolute w-12 h-12 text-white/80 group-hover:scale-110 transition-transform" />
            
            {/* Stream Status */}
            <div className="absolute top-3 left-3">
              {stream.isLive ? (
                <Badge variant="live" className="animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                  LIVE
                </Badge>
              ) : (
                <Badge variant="cosmic">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatRelativeTime(stream.scheduledFor!)}
                </Badge>
              )}
            </div>

            {/* Viewer Count or Price */}
            <div className="absolute top-3 right-3">
              {stream.isLive ? (
                <Badge variant="dark">
                  <Eye className="w-3 h-3 mr-1" />
                  {stream.viewerCount}
                </Badge>
              ) : stream.isPremium ? (
                <Badge variant="gold">
                  {formatCurrency(stream.price || 0)}
                </Badge>
              ) : null}
            </div>

            {/* Premium Badge */}
            {stream.isPremium && (
              <div className="absolute bottom-3 right-3">
                <Badge variant="gold" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-mystical-pink-400 transition-colors">
            {stream.title}
          </h3>
          
          <div className="flex items-center space-x-2 mb-3">
            <Avatar size="sm">
              <AvatarImage src={stream.reader.profileImage} />
              <AvatarFallback>
                {stream.reader.displayName.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm text-mystical-pink-400 font-medium">
                {stream.reader.displayName}
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 fill-mystical-gold-500 text-mystical-gold-500" />
                <span className="text-xs text-slate-400">
                  {stream.reader.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
          
          {stream.description && (
            <p className="text-slate-400 text-sm mb-3 line-clamp-2">
              {stream.description}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <Badge variant="mystical" className="text-xs">
              {stream.category}
            </Badge>
            
            <Button
              size="sm"
              onClick={() => stream.isLive ? onJoin(stream.id) : onSetReminder(stream.id)}
              variant={stream.isLive ? 'default' : 'outline'}
            >
              {stream.isLive ? 'Join Now' : 'Set Reminder'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
