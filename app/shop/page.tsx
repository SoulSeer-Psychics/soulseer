import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Star, 
  ShoppingCart, 
  Download,
  Package,
  Book,
  Headphones,
  Sparkles,
  Heart,
  Grid,
  List,
  Sort,
  Tag,
  TrendingUp,
  Gift
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { useApi, useDebounce } from '@/lib/hooks';
import Link from 'next/link';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: 'digital' | 'physical' | 'service';
  type: string; // e.g., 'course', 'audio', 'crystal', 'reading'
  images: string[];
  rating: number;
  totalReviews: number;
  totalSales: number;
  isDigital: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  tags: string[];
  reader?: {
    id: string;
    displayName: string;
    profileImage?: string;
    rating: number;
  };
  createdAt: string;
}

interface ShopFilters {
  search: string;
  category: 'all' | 'digital' | 'physical' | 'services';
  priceRange: {
    min: number;
    max: number;
  };
  rating: number;
  sortBy: 'popularity' | 'price' | 'rating' | 'newest';
  sortOrder: 'asc' | 'desc';
  tags: string[];
}

const CATEGORIES = [
  { id: 'all', label: 'All Products', icon: Sparkles },
  { id: 'digital', label: 'Digital Products', icon: Download },
  { id: 'physical', label: 'Physical Items', icon: Package },
  { id: 'services', label: 'Services', icon: Star },
];

const PRODUCT_TYPES = [
  'All Types',
  'Tarot Courses',
  'Meditation Audio',
  'Crystal Sets',
  'Oracle Decks',
  'Astrology Reports',
  'Healing Sessions',
  'Spiritual Books',
  'Sage & Incense',
  'Jewelry & Accessories'
];

const POPULAR_TAGS = [
  'Beginner Friendly',
  'Advanced',
  'Love & Relationships',
  'Career Guidance',
  'Spiritual Growth',
  'Meditation',
  'Chakra Healing',
  'Protection',
  'Manifestation',
  'Divination'
];

export default function ShopPage() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<ShopFilters>({
    search: searchParams?.get('search') || '',
    category: (searchParams?.get('category') as any) || 'all',
    priceRange: { min: 0, max: 500 },
    rating: 0,
    sortBy: 'popularity',
    sortOrder: 'desc',
    tags: [],
  });

  const debouncedSearch = useDebounce(filters.search, 300);

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (filters.category !== 'all') queryParams.set('category', filters.category);
  if (filters.priceRange.min > 0) queryParams.set('minPrice', filters.priceRange.min.toString());
  if (filters.priceRange.max < 500) queryParams.set('maxPrice', filters.priceRange.max.toString());
  if (filters.rating > 0) queryParams.set('minRating', filters.rating.toString());
  if (filters.tags.length > 0) queryParams.set('tags', filters.tags.join(','));
  queryParams.set('sortBy', filters.sortBy);
  queryParams.set('sortOrder', filters.sortOrder);

  const { data: products, loading, error, refetch } = useApi<Product[]>(
    `/api/shop/products?${queryParams.toString()}`
  );

  const { data: featuredProducts } = useApi<Product[]>('/api/shop/products/featured?limit=6');
  const { data: categories } = useApi<Array<{ category: string; count: number }>>('/api/shop/categories');

  const handleFilterChange = (key: keyof ShopFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleAddToCart = (productId: string) => {
    setCartItems(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleAddToWishlist = (productId: string) => {
    setWishlistItems(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      priceRange: { min: 0, max: 500 },
      rating: 0,
      sortBy: 'popularity',
      sortOrder: 'desc',
      tags: [],
    });
  };

  const getProductIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'course': return Book;
      case 'audio': return Headphones;
      case 'crystal': return Sparkles;
      case 'reading': return Star;
      default: return Package;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-alex-brush text-mystical-pink-500 mb-4 mystical-glow">
            Spiritual Marketplace
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Discover tools, courses, and sacred items to enhance your spiritual journey. 
            Created by our community of gifted readers.
          </p>
        </div>

        {/* Featured Products */}
        {featuredProducts && featuredProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-alex-brush text-mystical-pink-500 mb-6 text-center">
              Featured Products
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.slice(0, 6).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant="featured"
                  isInCart={cartItems.includes(product.id)}
                  isInWishlist={wishlistItems.includes(product.id)}
                  onAddToCart={handleAddToCart}
                  onAddToWishlist={handleAddToWishlist}
                />
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {CATEGORIES.map((category) => (
            <Card
              key={category.id}
              variant="mystical"
              className={`cursor-pointer transition-all hover:scale-105 ${
                filters.category === category.id ? 'ring-2 ring-mystical-pink-500' : ''
              }`}
              onClick={() => handleFilterChange('category', category.id)}
            >
              <CardContent className="p-6 text-center">
                <category.icon className="w-8 h-8 text-mystical-pink-500 mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-1">{category.label}</h3>
                <p className="text-sm text-slate-400">
                  {categories?.find(c => c.category === category.id)?.count || 0} items
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Controls */}
        <Card variant="mystical" className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Search */}
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    variant="mystical"
                    placeholder="Search products, courses, or creators..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-3">
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  {filters.tags.length > 0 && (
                    <Badge variant="cosmic" className="ml-1 px-1.5 py-0.5 text-xs">
                      {filters.tags.length}
                    </Badge>
                  )}
                </Button>

                <div className="flex items-center border border-slate-600 rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none border-0"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none border-0"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-') as [string, 'asc' | 'desc'];
                    handleFilterChange('sortBy', sortBy);
                    handleFilterChange('sortOrder', sortOrder);
                  }}
                  className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                >
                  <option value="popularity-desc">Most Popular</option>
                  <option value="rating-desc">Highest Rated</option>
                  <option value="price-asc">Lowest Price</option>
                  <option value="price-desc">Highest Price</option>
                  <option value="newest-desc">Newest First</option>
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-slate-700 space-y-6">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-3">
                    Price Range
                  </label>
                  <div className="flex items-center space-x-3">
                    <Input
                      variant="mystical"
                      type="number"
                      min="0"
                      max="500"
                      placeholder="Min"
                      value={filters.priceRange.min || ''}
                      onChange={(e) => handleFilterChange('priceRange', {
                        ...filters.priceRange,
                        min: parseInt(e.target.value) || 0
                      })}
                      className="w-24"
                    />
                    <span className="text-slate-400">-</span>
                    <Input
                      variant="mystical"
                      type="number"
                      min="0"
                      max="500"
                      placeholder="Max"
                      value={filters.priceRange.max || ''}
                      onChange={(e) => handleFilterChange('priceRange', {
                        ...filters.priceRange,
                        max: parseInt(e.target.value) || 500
                      })}
                      className="w-24"
                    />
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-3">
                    Minimum Rating
                  </label>
                  <select
                    value={filters.rating}
                    onChange={(e) => handleFilterChange('rating', parseInt(e.target.value))}
                    className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={4.5}>4.5+ Stars</option>
                    <option value={4}>4+ Stars</option>
                    <option value={3.5}>3.5+ Stars</option>
                    <option value={3}>3+ Stars</option>
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-3">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TAGS.map((tag) => (
                      <Button
                        key={tag}
                        variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleTagToggle(tag)}
                        className="text-xs"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex justify-end">
                  <Button variant="ghost" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div>
          {loading ? (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} variant="mystical" className="overflow-hidden">
                  <CardContent className="p-0">
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card variant="mystical">
              <CardContent className="p-12 text-center">
                <div className="text-red-400 mb-4">
                  <Package className="w-12 h-12 mx-auto mb-4" />
                  <p>Error loading products. Please try again.</p>
                </div>
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : products && products.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <p className="text-slate-400">
                  Found {products.length} product{products.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variant={viewMode === 'list' ? 'list' : 'default'}
                    isInCart={cartItems.includes(product.id)}
                    isInWishlist={wishlistItems.includes(product.id)}
                    onAddToCart={handleAddToCart}
                    onAddToWishlist={handleAddToWishlist}
                  />
                ))}
              </div>
            </>
          ) : (
            <Card variant="mystical">
              <CardContent className="p-12 text-center">
                <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-4">No products found</h3>
                <p className="text-slate-400 mb-6">
                  Try adjusting your search criteria or browse our featured products above.
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Load More */}
        {products && products.length >= 20 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Products
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function ProductCard({ 
  product, 
  variant = 'default',
  isInCart,
  isInWishlist,
  onAddToCart,
  onAddToWishlist
}: { 
  product: Product;
  variant?: 'default' | 'featured' | 'list';
  isInCart: boolean;
  isInWishlist: boolean;
  onAddToCart: (id: string) => void;
  onAddToWishlist: (id: string) => void;
}) {
  const ProductIcon = getProductIcon(product.type);

  return (
    <Card 
      variant={variant === 'featured' ? 'cosmic' : 'mystical'} 
      className={`overflow-hidden group cursor-pointer hover:scale-105 transition-transform ${
        variant === 'featured' ? 'ring-2 ring-mystical-gold-500/50' : ''
      }`}
      glow={variant === 'featured'}
    >
      <CardContent className="p-0">
        <div className="relative">
          <div className="aspect-square bg-cosmic-800 flex items-center justify-center relative overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <img 
                src={product.images[0]} 
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <ProductIcon className="w-16 h-16 text-mystical-gold-400" />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Quick Actions */}
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  onAddToWishlist(product.id);
                }}
                className={`bg-white/90 hover:bg-white ${
                  isInWishlist ? 'text-red-500' : 'text-slate-700'
                }`}
              >
                <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-current' : ''}`} />
              </Button>
            </div>

            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col space-y-1">
              {product.isOnSale && (
                <Badge variant="destructive" className="text-xs">
                  Sale
                </Badge>
              )}
              {product.isFeatured && (
                <Badge variant="gold" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
              {product.isDigital && (
                <Badge variant="cosmic" className="text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  Digital
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-white line-clamp-2 group-hover:text-mystical-pink-400 transition-colors">
              {product.title}
            </h3>
            <div className="text-right ml-2">
              <div className="text-lg font-bold text-mystical-gold-400">
                {formatCurrency(product.price)}
              </div>
              {product.originalPrice && product.originalPrice > product.price && (
                <div className="text-sm text-slate-400 line-through">
                  {formatCurrency(product.originalPrice)}
                </div>
              )}
            </div>
          </div>
          
          {product.reader && (
            <div className="flex items-center space-x-2 mb-3">
              <Avatar size="sm">
                <AvatarImage src={product.reader.profileImage} />
                <AvatarFallback>
                  {product.reader.displayName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm text-mystical-pink-400">
                by {product.reader.displayName}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(product.rating)
                      ? 'fill-mystical-gold-500 text-mystical-gold-500'
                      : 'text-slate-600'
                  }`}
                />
              ))}
              <span className="text-sm text-slate-400 ml-1">
                ({product.totalReviews})
              </span>
            </div>
            
            <div className="text-sm text-slate-500">
              {product.totalSales} sold
            </div>
          </div>
          
          <p className="text-slate-300 text-sm mb-4 line-clamp-2">
            {product.description}
          </p>
          
          <div className="flex flex-wrap gap-1 mb-4">
            {product.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="mystical" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <Link href={`/shop/products/${product.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                View Details
              </Button>
            </Link>
            <Button
              variant={isInCart ? 'destructive' : 'default'}
              size="sm"
              onClick={() => onAddToCart(product.id)}
              className="flex-1"
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              {isInCart ? 'Remove' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
