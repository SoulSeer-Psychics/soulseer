import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Plus,
  TrendingUp,
  Clock,
  Users,
  Star,
  Pin,
  Lock,
  Flag,
  Heart,
  Reply,
  ThumbsUp,
  Eye,
  ChevronUp,
  ChevronDown,
  Award,
  Sparkles
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatRelativeTime } from '@/lib/utils';
import { useApi, useDebounce } from '@/lib/hooks';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author: {
    id: string;
    name: string;
    avatar?: string;
    isReader: boolean;
    isModerator: boolean;
    reputation: number;
  };
  isPinned: boolean;
  isLocked: boolean;
  views: number;
  replies: number;
  likes: number;
  isLiked: boolean;
  lastReply?: {
    author: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  postCount: number;
  isRestricted?: boolean;
}

const FORUM_CATEGORIES: ForumCategory[] = [
  {
    id: 'all',
    name: 'All Discussions',
    description: 'View all forum posts',
    icon: MessageSquare,
    color: 'text-slate-400',
    postCount: 0,
  },
  {
    id: 'general',
    name: 'General Discussion',
    description: 'Open discussions about spirituality and life',
    icon: Users,
    color: 'text-blue-400',
    postCount: 234,
  },
  {
    id: 'readings',
    name: 'Reading Experiences',
    description: 'Share your reading experiences and testimonials',
    icon: Star,
    color: 'text-mystical-pink-400',
    postCount: 189,
  },
  {
    id: 'learning',
    name: 'Learning & Growth',
    description: 'Tips, courses, and spiritual development',
    icon: Award,
    color: 'text-mystical-gold-400',
    postCount: 156,
  },
  {
    id: 'tools',
    name: 'Tools & Techniques',
    description: 'Discuss tarot, astrology, crystals, and more',
    icon: Sparkles,
    color: 'text-purple-400',
    postCount: 98,
  },
  {
    id: 'qa',
    name: 'Questions & Answers',
    description: 'Ask questions and get help from the community',
    icon: MessageSquare,
    color: 'text-green-400',
    postCount: 278,
  },
  {
    id: 'readers-only',
    name: 'Readers Only',
    description: 'Private discussions for verified readers',
    icon: Lock,
    color: 'text-orange-400',
    postCount: 67,
    isRestricted: true,
  },
];

export default function CommunityPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams?.get('category') || 'all'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending'>('latest');
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Build query params
  const queryParams = new URLSearchParams();
  if (selectedCategory !== 'all') queryParams.set('category', selectedCategory);
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  queryParams.set('sortBy', sortBy);

  const { data: posts, loading, refetch } = useApi<ForumPost[]>(
    `/api/community/posts?${queryParams.toString()}`
  );

  const { data: trendingPosts } = useApi<ForumPost[]>(
    '/api/community/posts/trending?limit=5'
  );

  const { data: featuredReaders } = useApi<any[]>(
    '/api/community/featured-readers?limit=3'
  );

  const handleCreatePost = async (postData: any) => {
    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        setShowNewPostDialog(false);
        refetch();
      }
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST',
      });
      refetch();
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-alex-brush text-mystical-pink-500 mb-4 mystical-glow">
            Community Forum
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Connect with fellow seekers, share experiences, and learn from our community of spiritual practitioners.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Categories */}
            <Card variant="mystical">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {FORUM_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-mystical-pink-500/20 border-mystical-pink-500/30 border'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <category.icon className={`w-4 h-4 ${category.color}`} />
                      <div className="flex-1">
                        <div className="font-medium text-white text-sm flex items-center">
                          {category.name}
                          {category.isRestricted && (
                            <Lock className="w-3 h-3 ml-1 text-orange-400" />
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {category.postCount} posts
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Trending Posts */}
            <Card variant="mystical">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Trending
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingPosts && trendingPosts.length > 0 ? (
                  trendingPosts.map((post) => (
                    <Link key={post.id} href={`/community/posts/${post.id}`}>
                      <div className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
                        <h4 className="font-medium text-white text-sm line-clamp-2 mb-1">
                          {post.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <Eye className="w-3 h-3" />
                          <span>{post.views}</span>
                          <Reply className="w-3 h-3" />
                          <span>{post.replies}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">No trending posts</p>
                )}
              </CardContent>
            </Card>

            {/* Featured Readers */}
            <Card variant="mystical">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Featured Readers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {featuredReaders && featuredReaders.length > 0 ? (
                  featuredReaders.map((reader) => (
                    <Link key={reader.id} href={`/readers/${reader.id}`}>
                      <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer">
                        <Avatar size="sm">
                          <AvatarImage src={reader.profileImage} />
                          <AvatarFallback>
                            {reader.displayName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-white text-sm">
                            {reader.displayName}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-mystical-gold-500 text-mystical-gold-500" />
                            <span className="text-xs text-slate-400">
                              {reader.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">No featured readers</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Controls */}
            <Card variant="mystical">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        variant="mystical"
                        placeholder="Search discussions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                    >
                      <option value="latest">Latest</option>
                      <option value="popular">Most Popular</option>
                      <option value="trending">Trending</option>
                    </select>
                    
                    {user && (
                      <Button onClick={() => setShowNewPostDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Post
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts List */}
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} variant="mystical">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : posts && posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onLike={handleLikePost}
                  />
                ))
              ) : (
                <Card variant="mystical">
                  <CardContent className="p-12 text-center">
                    <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-4">No posts found</h3>
                    <p className="text-slate-400 mb-6">
                      {searchQuery || selectedCategory !== 'all'
                        ? 'No posts match your search criteria.'
                        : 'Be the first to start a discussion!'}
                    </p>
                    {user && (
                      <Button onClick={() => setShowNewPostDialog(true)}>
                        Create New Post
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* New Post Dialog */}
        {showNewPostDialog && (
          <NewPostDialog
            categories={FORUM_CATEGORIES.filter(c => c.id !== 'all')}
            onClose={() => setShowNewPostDialog(false)}
            onSubmit={handleCreatePost}
          />
        )}
      </div>
    </Layout>
  );
}

function PostCard({ 
  post, 
  onLike 
}: { 
  post: ForumPost; 
  onLike: (id: string) => void; 
}) {
  return (
    <Link href={`/community/posts/${post.id}`}>
      <Card variant="mystical" className="hover:scale-[1.02] transition-transform cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            {/* Author Avatar */}
            <Avatar>
              <AvatarImage src={post.author.avatar} />
              <AvatarFallback>
                {post.author.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            {/* Post Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    {post.isPinned && (
                      <Pin className="w-4 h-4 text-mystical-gold-500" />
                    )}
                    <h3 className="font-semibold text-white hover:text-mystical-pink-400 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    {post.isLocked && (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3 text-sm text-slate-400">
                    <span className={`font-medium ${
                      post.author.isReader ? 'text-mystical-pink-400' : 'text-white'
                    }`}>
                      {post.author.name}
                    </span>
                    {post.author.isReader && (
                      <Badge variant="mystical" className="text-xs px-2 py-0">
                        Reader
                      </Badge>
                    )}
                    {post.author.isModerator && (
                      <Badge variant="gold" className="text-xs px-2 py-0">
                        Mod
                      </Badge>
                    )}
                    <span>•</span>
                    <span>{formatRelativeTime(post.createdAt)}</span>
                    <Badge variant="cosmic" className="text-xs">
                      {post.category}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Content Preview */}
              <p className="text-slate-300 text-sm line-clamp-3 mb-3">
                {post.content}
              </p>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {post.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="mystical" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{post.views}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Reply className="w-4 h-4" />
                    <span>{post.replies}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onLike(post.id);
                    }}
                    className={`flex items-center space-x-1 hover:text-red-400 transition-colors ${
                      post.isLiked ? 'text-red-500' : ''
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                    <span>{post.likes}</span>
                  </button>
                </div>

                {post.lastReply && (
                  <div className="text-xs text-slate-500">
                    Last reply by {post.lastReply.author} • {formatRelativeTime(post.lastReply.timestamp)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function NewPostDialog({ 
  categories, 
  onClose, 
  onSubmit 
}: {
  categories: ForumCategory[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) return;

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent variant="cosmic" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Title</Label>
            <Input
              variant="mystical"
              placeholder="What's on your mind?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Content</Label>
            <Textarea
              variant="mystical"
              placeholder="Share your thoughts, experiences, or questions..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              required
            />
          </div>

          <div>
            <Label>Tags (optional)</Label>
            <Input
              variant="mystical"
              placeholder="meditation, tarot, astrology (separated by commas)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="flex space-x-3">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!title.trim() || !content.trim()}>
              Create Post
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
