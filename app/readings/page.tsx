import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  MessageCircle, 
  Phone, 
  Video,
  SlidersHorizontal,
  Grid,
  List,
  Sort
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ReaderCard from '@/components/features/reader-card';
import { useApi, useDebounce } from '@/lib/hooks';
import { formatCurrency } from '@/lib/utils';

interface ReadingFilters {
  search: string;
  specialties: string[];
  priceRange: {
    min: number;
    max: number;
  };
  rating: number;
  availability: 'all' | 'online' | 'available';
  experience: number;
  languages: string[];
  sortBy: 'rating' | 'price' | 'experience' | 'reviews';
  sortOrder: 'asc' | 'desc';
}

const SPECIALTIES = [
  'Tarot Reading',
  'Love & Relationships',
  'Career Guidance',
  'Astrology',
  'Psychic Reading',
  'Spiritual Healing',
  'Crystal Ball',
  'Past Life',
  'Dream Interpretation',
  'Numerology',
  'Energy Reading',
  'Chakra Balancing'
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Chinese',
  'Japanese',
  'Hindi'
];

export default function ReadingsPage() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ReadingFilters>({
    search: searchParams?.get('search') || '',
    specialties: searchParams?.get('specialty') ? [searchParams.get('specialty')!] : [],
    priceRange: { min: 0, max: 20 },
    rating: 0,
    availability: 'all',
    experience: 0,
    languages: [],
    sortBy: 'rating',
    sortOrder: 'desc',
  });

  const debouncedSearch = useDebounce(filters.search, 300);

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (filters.specialties.length > 0) queryParams.set('specialties', filters.specialties.join(','));
  if (filters.priceRange.min > 0) queryParams.set('minPrice', filters.priceRange.min.toString());
  if (filters.priceRange.max < 20) queryParams.set('maxPrice', filters.priceRange.max.toString());
  if (filters.rating > 0) queryParams.set('minRating', filters.rating.toString());
  if (filters.availability !== 'all') queryParams.set('availability', filters.availability);
  if (filters.experience > 0) queryParams.set('minExperience', filters.experience.toString());
  if (filters.languages.length > 0) queryParams.set('languages', filters.languages.join(','));
  queryParams.set('sortBy', filters.sortBy);
  queryParams.set('sortOrder', filters.sortOrder);

  const { data: readers, loading, error, refetch } = useApi<any[]>(
    `/api/readers/search?${queryParams.toString()}`
  );

  const { data: featuredReaders } = useApi<any[]>('/api/readers/featured?limit=3');

  const handleFilterChange = (key: keyof ReadingFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setFilters(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleLanguageToggle = (language: string) => {
    setFilters(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      specialties: [],
      priceRange: { min: 0, max: 20 },
      rating: 0,
      availability: 'all',
      experience: 0,
      languages: [],
      sortBy: 'rating',
      sortOrder: 'desc',
    });
  };

  const handleStartReading = (readerId: string, type: 'chat' | 'voice' | 'video') => {
    window.location.href = `/readings/start?readerId=${readerId}&type=${type}`;
  };

  const handleFavorite = (readerId: string) => {
    // Handle favorite logic - would call API
    console.log('Favorite reader:', readerId);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-alex-brush text-mystical-pink-500 mb-4 mystical-glow">
            Find Your Reader
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Connect with gifted psychics and spiritual advisors for personalized guidance on your life's journey.
          </p>
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
                    placeholder="Search by name, specialty, or keywords..."
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
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filters</span>
                  {(filters.specialties.length > 0 || filters.rating > 0 || filters.availability !== 'all') && (
                    <Badge variant="cosmic" className="ml-1 px-1.5 py-0.5 text-xs">
                      {filters.specialties.length + (filters.rating > 0 ? 1 : 0) + (filters.availability !== 'all' ? 1 : 0)}
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
                  <option value="rating-desc">Highest Rated</option>
                  <option value="rating-asc">Lowest Rated</option>
                  <option value="price-asc">Lowest Price</option>
                  <option value="price-desc">Highest Price</option>
                  <option value="experience-desc">Most Experience</option>
                  <option value="reviews-desc">Most Reviews</option>
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-slate-700 space-y-6">
                {/* Specialties */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-3">
                    Specialties
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map((specialty) => (
                      <Button
                        key={specialty}
                        variant={filters.specialties.includes(specialty) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSpecialtyToggle(specialty)}
                        className="text-xs"
                      >
                        {specialty}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-3">
                      Price Range (per minute)
                    </label>
                    <div className="flex items-center space-x-3">
                      <Input
                        variant="mystical"
                        type="number"
                        min="0"
                        max="20"
                        placeholder="Min"
                        value={filters.priceRange.min || ''}
                        onChange={(e) => handleFilterChange('priceRange', {
                          ...filters.priceRange,
                          min: parseInt(e.target.value) || 0
                        })}
                        className="w-20"
                      />
                      <span className="text-slate-400">-</span>
                      <Input
                        variant="mystical"
                        type="number"
                        min="0"
                        max="20"
                        placeholder="Max"
                        value={filters.priceRange.max || ''}
                        onChange={(e) => handleFilterChange('priceRange', {
                          ...filters.priceRange,
                          max: parseInt(e.target.value) || 20
                        })}
                        className="w-20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-3">
                      Minimum Rating
                    </label>
                    <select
                      value={filters.rating}
                      onChange={(e) => handleFilterChange('rating', parseInt(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                    >
                      <option value={0}>Any Rating</option>
                      <option value={4.5}>4.5+ Stars</option>
                      <option value={4}>4+ Stars</option>
                      <option value={3.5}>3.5+ Stars</option>
                      <option value={3}>3+ Stars</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-3">
                      Availability
                    </label>
                    <select
                      value={filters.availability}
                      onChange={(e) => handleFilterChange('availability', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                    >
                      <option value="all">All Readers</option>
                      <option value="online">Online Only</option>
                      <option value="available">Available Now</option>
                    </select>
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-3">
                    Languages
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((language) => (
                      <Button
                        key={language}
                        variant={filters.languages.includes(language) ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleLanguageToggle(language)}
                        className="text-xs"
                      >
                        {language}
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

        {/* Featured Readers (when no search/filters) */}
        {!debouncedSearch && filters.specialties.length === 0 && featuredReaders && featuredReaders.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-alex-brush text-mystical-pink-500 mb-6 text-center">
              Featured Readers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredReaders.map((reader) => (
                <ReaderCard
                  key={reader.id}
                  reader={reader}
                  variant="featured"
                  onStartReading={handleStartReading}
                  onFavorite={handleFavorite}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div>
          {loading ? (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} variant="mystical">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="w-16 h-16 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card variant="mystical">
              <CardContent className="p-12 text-center">
                <div className="text-red-400 mb-4">
                  <Search className="w-12 h-12 mx-auto mb-4" />
                  <p>Error loading readers. Please try again.</p>
                </div>
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : readers && readers.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <p className="text-slate-400">
                  Found {readers.length} reader{readers.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {readers.map((reader) => (
                  <ReaderCard
                    key={reader.id}
                    reader={reader}
                    variant={viewMode === 'list' ? 'default' : 'compact'}
                    onStartReading={handleStartReading}
                    onFavorite={handleFavorite}
                  />
                ))}
              </div>
            </>
          ) : (
            <Card variant="mystical">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-4">No readers found</h3>
                <p className="text-slate-400 mb-6">
                  Try adjusting your search criteria or browse our featured readers above.
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Load More (if needed) */}
        {readers && readers.length >= 20 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Readers
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
