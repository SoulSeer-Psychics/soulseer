import React from 'react';
import Link from 'next/link';
import { Star, Heart, Clock, MessageCircle, Phone, Video, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, getUserDisplayName } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ReaderCardProps {
  reader: {
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
    pricing: {
      chat: number;
      voice: number;
      video: number;
    };
    totalMinutes?: number;
    languages?: string[];
  };
  onStartReading?: (readerId: string, type: 'chat' | 'voice' | 'video') => void;
  onFavorite?: (readerId: string) => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

export function ReaderCard({
  reader,
  onStartReading,
  onFavorite,
  isFavorite = false,
  variant = 'default',
  className,
}: ReaderCardProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'w-3 h-3',
          i < Math.floor(rating) 
            ? 'fill-mystical-gold-500 text-mystical-gold-500' 
            : 'text-slate-600'
        )}
      />
    ));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const cardVariants = {
    default: 'p-4',
    compact: 'p-3',
    featured: 'p-6 border-mystical-gold-500/30 mystical-glow',
  };

  const getStatusBadge = () => {
    if (!reader.isOnline) {
      return <Badge variant="offline">Offline</Badge>;
    }
    if (!reader.isAvailable) {
      return <Badge variant="busy">Busy</Badge>;
    }
    return <Badge variant="online">Available Now</Badge>;
  };

  return (
    <Card 
      variant="mystical" 
      className={cn(
        'relative overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
        cardVariants[variant],
        className
      )}
    >
      {variant === 'featured' && (
        <div className="absolute top-0 right-0 bg-mystical-gold-500 text-cosmic-900 text-xs px-2 py-1 rounded-bl-md font-medium">
          <Sparkles className="w-3 h-3 inline mr-1" />
          Featured
        </div>
      )}

      <CardContent className={cn(variant === 'compact' ? 'p-0' : 'p-0')}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar size={variant === 'compact' ? 'md' : 'lg'} glow={reader.isOnline}>
                  <AvatarImage src={reader.profileImage} />
                  <AvatarFallback>{getInitials(reader.displayName)}</AvatarFallback>
                </Avatar>
                {reader.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-800 rounded-full" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-alex-brush text-xl text-mystical-pink-400 truncate">
                  {reader.displayName}
                </h3>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="flex items-center space-x-1">
                    {renderStars(reader.rating)}
                    <span className="text-slate-300 ml-1">
                      {reader.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">
                    {reader.totalReviews} reviews
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-2">
              {getStatusBadge()}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFavorite?.(reader.id)}
                className={cn(
                  'p-1 h-auto',
                  isFavorite && 'text-red-500 hover:text-red-400'
                )}
              >
                <Heart className={cn('w-4 h-4', isFavorite && 'fill-current')} />
              </Button>
            </div>
          </div>

          {/* Bio */}
          {variant !== 'compact' && (
            <p className="text-slate-300 text-sm leading-relaxed line-clamp-2">
              {reader.bio}
            </p>
          )}

          {/* Specialties */}
          <div className="flex flex-wrap gap-1">
            {reader.specialties.slice(0, variant === 'compact' ? 2 : 3).map((specialty) => (
              <Badge key={specialty} variant="mystical" className="text-xs">
                {specialty}
              </Badge>
            ))}
            {reader.specialties.length > (variant === 'compact' ? 2 : 3) && (
              <Badge variant="cosmic" className="text-xs">
                +{reader.specialties.length - (variant === 'compact' ? 2 : 3)} more
              </Badge>
            )}
          </div>

          {/* Experience & Stats */}
          {variant !== 'compact' && (
            <div className="flex items-center justify-between text-sm text-slate-400">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{reader.experience} years</span>
                </div>
                {reader.totalMinutes && (
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{Math.floor(reader.totalMinutes / 60)}+ hrs</span>
                  </div>
                )}
              </div>
              {reader.languages && reader.languages.length > 0 && (
                <span className="text-xs">
                  {reader.languages.slice(0, 2).join(', ')}
                  {reader.languages.length > 2 && ` +${reader.languages.length - 2}`}
                </span>
              )}
            </div>
          )}

          {/* Pricing & Actions */}
          <div className="border-t border-slate-700 pt-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <div className="text-xs text-slate-400">Chat</div>
                <div className="text-sm font-medium text-white">
                  {formatCurrency(reader.pricing.chat)}/min
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400">Voice</div>
                <div className="text-sm font-medium text-white">
                  {formatCurrency(reader.pricing.voice)}/min
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400">Video</div>
                <div className="text-sm font-medium text-white">
                  {formatCurrency(reader.pricing.video)}/min
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!reader.isOnline || !reader.isAvailable}
                onClick={() => onStartReading?.(reader.id, 'chat')}
                className="flex items-center justify-center space-x-1 text-xs"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Chat</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!reader.isOnline || !reader.isAvailable}
                onClick={() => onStartReading?.(reader.id, 'voice')}
                className="flex items-center justify-center space-x-1 text-xs"
              >
                <Phone className="w-3 h-3" />
                <span>Call</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!reader.isOnline || !reader.isAvailable}
                onClick={() => onStartReading?.(reader.id, 'video')}
                className="flex items-center justify-center space-x-1 text-xs"
              >
                <Video className="w-3 h-3" />
                <span>Video</span>
              </Button>
            </div>

            {/* View Profile Link */}
            <Link href={`/readers/${reader.id}`} className="block mt-2">
              <Button variant="ghost" size="sm" className="w-full text-mystical-pink-400 hover:text-mystical-pink-300">
                View Full Profile
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReaderCard;
