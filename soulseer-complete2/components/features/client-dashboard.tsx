import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  Clock, 
  Star, 
  MessageCircle, 
  Phone, 
  Video,
  Heart,
  DollarSign,
  Plus,
  History,
  Calendar,
  User,
  Settings,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, formatDuration, formatRelativeTime } from '@/lib/utils';
import { useClientBalance, useApi } from '@/lib/hooks';
import ReaderCard from '@/components/features/reader-card';
import AddFundsDialog from '@/components/features/add-funds-dialog';

interface ClientDashboardProps {
  user: any;
}

interface RecentSession {
  id: string;
  reader: {
    displayName: string;
    profileImage?: string;
  };
  type: 'chat' | 'voice' | 'video';
  duration: number;
  totalCost: number;
  rating?: number;
  createdAt: string;
}

interface FavoriteReader {
  id: string;
  displayName: string;
  profileImage?: string;
  isOnline: boolean;
  isAvailable: boolean;
  rating: number;
  specialties: string[];
}

export default function ClientDashboard({ user }: ClientDashboardProps) {
  const [showAddFunds, setShowAddFunds] = useState(false);
  const { balance, loading: balanceLoading, refetch: refetchBalance } = useClientBalance();
  
  const { data: recentSessions, loading: sessionsLoading } = useApi<RecentSession[]>(
    '/api/readings/history?limit=5'
  );
  
  const { data: favoriteReaders, loading: favoritesLoading } = useApi<FavoriteReader[]>(
    '/api/favorites/readers'
  );
  
  const { data: onlineReaders, loading: readersLoading } = useApi<any[]>(
    '/api/readers/online?limit=3'
  );

  const { data: stats, loading: statsLoading } = useApi<{
    totalSessions: number;
    totalSpent: number;
    averageRating: number;
    favoriteReadersCount: number;
  }>('/api/stats/client');

  const handleAddFunds = async (amount: number) => {
    setShowAddFunds(false);
    await refetchBalance();
  };

  const quickStats = [
    {
      title: 'Total Sessions',
      value: stats?.totalSessions || 0,
      icon: MessageCircle,
      color: 'text-mystical-pink-500',
    },
    {
      title: 'Total Spent',
      value: formatCurrency(stats?.totalSpent || 0),
      icon: DollarSign,
      color: 'text-mystical-gold-500',
    },
    {
      title: 'Average Rating',
      value: `${(stats?.averageRating || 0).toFixed(1)}★`,
      icon: Star,
      color: 'text-mystical-pink-500',
    },
    {
      title: 'Favorite Readers',
      value: stats?.favoriteReadersCount || 0,
      icon: Heart,
      color: 'text-red-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-alex-brush text-mystical-pink-500 mb-2">
            Welcome back, {user.firstName || 'Seeker'}!
          </h1>
          <p className="text-slate-300">
            Your spiritual journey continues. Discover insights and guidance from our gifted readers.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link href="/readings">
            <Button variant="default">
              <MessageCircle className="w-4 h-4 mr-2" />
              Start New Reading
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Balance Card */}
      <Card variant="cosmic" glow className="relative overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Account Balance
            </span>
            <Button onClick={() => setShowAddFunds(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Funds
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="text-3xl font-bold text-mystical-gold-400 mb-2">
                {balanceLoading ? '...' : formatCurrency(parseFloat(balance?.balance || '0'))}
              </div>
              <div className="text-sm text-slate-400">
                Available for readings
              </div>
            </div>
            
            {balance && parseFloat(balance.balance) < 10 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                <p className="text-yellow-400 text-sm">
                  Low balance - Add funds to continue your spiritual journey
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setShowAddFunds(true)}
                >
                  Add Funds Now
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index} variant="mystical">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.title}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Sessions */}
        <Card variant="mystical">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Sessions
              </span>
              <Link href="/dashboard/history">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-10 h-10 bg-slate-700 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-1/2" />
                      <div className="h-3 bg-slate-700 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentSessions && recentSessions.length > 0 ? (
              <div className="space-y-4">
                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Avatar size="sm">
                        <AvatarImage src={session.reader.profileImage} />
                        <AvatarFallback>
                          {session.reader.displayName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-white">{session.reader.displayName}</div>
                        <div className="flex items-center space-x-2 text-sm text-slate-400">
                          {session.type === 'chat' && <MessageCircle className="w-3 h-3" />}
                          {session.type === 'voice' && <Phone className="w-3 h-3" />}
                          {session.type === 'video' && <Video className="w-3 h-3" />}
                          <span>{formatDuration(session.duration)}</span>
                          <span>•</span>
                          <span>{formatCurrency(session.totalCost)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-400">
                        {formatRelativeTime(session.createdAt)}
                      </div>
                      {session.rating && (
                        <div className="flex items-center space-x-1 mt-1">
                          {Array.from({ length: session.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-mystical-gold-500 text-mystical-gold-500" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">No readings yet</p>
                <Link href="/readings">
                  <Button variant="outline">Start Your First Reading</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Favorite Readers */}
        <Card variant="mystical">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Heart className="w-5 h-5 mr-2" />
                Favorite Readers
              </span>
              <Link href="/dashboard/favorites">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {favoritesLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-10 h-10 bg-slate-700 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-1/2" />
                      <div className="h-3 bg-slate-700 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : favoriteReaders && favoriteReaders.length > 0 ? (
              <div className="space-y-4">
                {favoriteReaders.map((reader) => (
                  <div key={reader.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar size="sm">
                          <AvatarImage src={reader.profileImage} />
                          <AvatarFallback>
                            {reader.displayName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {reader.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border border-slate-800 rounded-full" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white">{reader.displayName}</div>
                        <div className="flex items-center space-x-2 text-sm text-slate-400">
                          <Star className="w-3 h-3 fill-mystical-gold-500 text-mystical-gold-500" />
                          <span>{reader.rating.toFixed(1)}</span>
                          <span>•</span>
                          <span>{reader.specialties[0]}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Badge 
                        variant={reader.isOnline && reader.isAvailable ? 'online' : reader.isOnline ? 'busy' : 'offline'}
                      >
                        {reader.isOnline && reader.isAvailable ? 'Available' : reader.isOnline ? 'Busy' : 'Offline'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">No favorite readers yet</p>
                <Link href="/readings">
                  <Button variant="outline">Discover Readers</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Online Readers Quick Access */}
      <Card variant="mystical">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Available Now
            </span>
            <Link href="/readings">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-slate-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : onlineReaders && onlineReaders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {onlineReaders.map((reader) => (
                <ReaderCard
                  key={reader.id}
                  reader={reader}
                  variant="compact"
                  onStartReading={(readerId, type) => {
                    window.location.href = `/readings/start?readerId=${readerId}&type=${type}`;
                  }}
                  onFavorite={(readerId) => {
                    // Handle favorite logic
                    console.log('Favorite reader:', readerId);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No readers available at the moment</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Funds Dialog */}
      <AddFundsDialog
        open={showAddFunds}
        onClose={() => setShowAddFunds(false)}
        onSuccess={handleAddFunds}
        currentBalance={balance ? parseFloat(balance.balance) : 0}
      />
    </div>
  );
}
