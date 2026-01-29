import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  MessageCircle,
  Phone,
  Video,
  Star,
  Users,
  Eye,
  EyeOff,
  Settings,
  TrendingUp,
  TrendingDown,
  Award,
  Timer,
  Radio,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, formatDuration, formatRelativeTime } from '@/lib/utils';
import { useApi, useReaderProfile } from '@/lib/hooks';

interface ReaderDashboardProps {
  user: any;
}

interface EarningsData {
  today: number;
  thisWeek: number;
  thisMonth: number;
  pendingPayout: number;
  totalEarnings: number;
  payoutHistory: Array<{
    id: string;
    amount: number;
    date: string;
    status: string;
  }>;
}

interface SessionStats {
  totalSessions: number;
  totalMinutes: number;
  averageRating: number;
  totalReviews: number;
  repeatClients: number;
  responseRate: number;
}

interface RecentSession {
  id: string;
  client: {
    firstName: string;
    profileImage?: string;
  };
  type: 'chat' | 'voice' | 'video';
  duration: number;
  earnings: number;
  rating?: number;
  createdAt: string;
}

export default function ReaderDashboard({ user }: ReaderDashboardProps) {
  const [statusLoading, setStatusLoading] = useState(false);
  
  const { profile, updateStatus, refetch: refetchProfile } = useReaderProfile(user.id);
  
  const { data: earnings, loading: earningsLoading } = useApi<EarningsData>(
    '/api/reader/earnings'
  );
  
  const { data: sessionStats, loading: statsLoading } = useApi<SessionStats>(
    '/api/reader/stats'
  );
  
  const { data: recentSessions, loading: sessionsLoading } = useApi<RecentSession[]>(
    '/api/reader/sessions/recent?limit=5'
  );

  const { data: weeklyEarnings, loading: chartLoading } = useApi<Array<{ day: string; amount: number }>>(
    '/api/reader/earnings/weekly'
  );

  const handleStatusToggle = async (isOnline: boolean) => {
    setStatusLoading(true);
    try {
      await updateStatus(isOnline, isOnline);
      await refetchProfile();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAvailabilityToggle = async () => {
    if (!profile) return;
    
    setStatusLoading(true);
    try {
      await updateStatus(profile.isOnline, !profile.isAvailable);
      await refetchProfile();
    } catch (error) {
      console.error('Failed to update availability:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const earningsCards = [
    {
      title: 'Today',
      amount: earnings?.today || 0,
      icon: Calendar,
      color: 'text-mystical-pink-500',
      change: '+12%',
      positive: true,
    },
    {
      title: 'This Week',
      amount: earnings?.thisWeek || 0,
      icon: BarChart3,
      color: 'text-mystical-gold-500',
      change: '+8%',
      positive: true,
    },
    {
      title: 'This Month',
      amount: earnings?.thisMonth || 0,
      icon: TrendingUp,
      color: 'text-green-500',
      change: '+15%',
      positive: true,
    },
    {
      title: 'Pending Payout',
      amount: earnings?.pendingPayout || 0,
      icon: CreditCard,
      color: 'text-blue-500',
      change: 'Next: Tomorrow',
      positive: null,
    },
  ];

  const performanceMetrics = [
    {
      label: 'Total Sessions',
      value: sessionStats?.totalSessions || 0,
      icon: MessageCircle,
    },
    {
      label: 'Total Hours',
      value: Math.floor((sessionStats?.totalMinutes || 0) / 60),
      icon: Clock,
    },
    {
      label: 'Average Rating',
      value: `${(sessionStats?.averageRating || 0).toFixed(1)}★`,
      icon: Star,
    },
    {
      label: 'Repeat Clients',
      value: `${sessionStats?.repeatClients || 0}%`,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-alex-brush text-mystical-pink-500 mb-2">
            Welcome, {profile?.displayName || user.firstName}!
          </h1>
          <p className="text-slate-300">
            Manage your readings, track earnings, and connect with clients seeking guidance.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link href="/live/create">
            <Button variant="secondary">
              <Radio className="w-4 h-4 mr-2" />
              Go Live
            </Button>
          </Link>
          <Link href="/reader/settings">
            <Button variant="ghost">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Controls */}
      <Card variant="cosmic" glow className="relative overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Reader Status</span>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={profile?.isOnline ? 'online' : 'offline'}
                className="animate-pulse"
              >
                {profile?.isOnline ? 'Online' : 'Offline'}
              </Badge>
              {profile?.isOnline && (
                <Badge 
                  variant={profile.isAvailable ? 'mystical' : 'busy'}
                >
                  {profile.isAvailable ? 'Available' : 'Busy'}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <p className="text-slate-300">
                {profile?.isOnline && profile?.isAvailable 
                  ? 'You are available for readings' 
                  : profile?.isOnline 
                  ? 'You are online but busy' 
                  : 'You are offline - clients cannot book readings'}
              </p>
              <div className="text-sm text-slate-400">
                Current rates: Chat {formatCurrency(profile?.pricing?.chat || 0)}/min • 
                Voice {formatCurrency(profile?.pricing?.voice || 0)}/min • 
                Video {formatCurrency(profile?.pricing?.video || 0)}/min
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant={profile?.isOnline ? 'destructive' : 'default'}
                onClick={() => handleStatusToggle(!profile?.isOnline)}
                loading={statusLoading}
              >
                {profile?.isOnline ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Go Offline
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Go Online
                  </>
                )}
              </Button>
              
              {profile?.isOnline && (
                <Button
                  variant={profile.isAvailable ? 'outline' : 'default'}
                  onClick={handleAvailabilityToggle}
                  loading={statusLoading}
                >
                  {profile.isAvailable ? 'Set Busy' : 'Set Available'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {earningsCards.map((card, index) => (
          <Card key={index} variant="mystical">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <card.icon className={`w-6 h-6 ${card.color}`} />
                {card.positive !== null && (
                  <span className={`text-xs flex items-center ${
                    card.positive ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {card.positive ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {card.change}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(card.amount)}
                </div>
                <div className="text-xs text-slate-400">{card.title}</div>
                {card.positive === null && (
                  <div className="text-xs text-slate-500">{card.change}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Metrics */}
        <Card variant="mystical">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <metric.icon className="w-4 h-4 text-mystical-pink-500" />
                  <span className="text-sm text-slate-300">{metric.label}</span>
                </div>
                <span className="font-medium text-white">{metric.value}</span>
              </div>
            ))}
            
            {sessionStats && sessionStats.responseRate && (
              <div className="pt-4 border-t border-slate-700">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300">Response Rate</span>
                  <span className="text-white">{sessionStats.responseRate}%</span>
                </div>
                <Progress 
                  value={sessionStats.responseRate} 
                  variant="mystical"
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card variant="mystical" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Sessions
              </span>
              <Link href="/reader/sessions">
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
                        <AvatarImage src={session.client.profileImage} />
                        <AvatarFallback>
                          {session.client.firstName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-white">{session.client.firstName}</div>
                        <div className="flex items-center space-x-2 text-sm text-slate-400">
                          {session.type === 'chat' && <MessageCircle className="w-3 h-3" />}
                          {session.type === 'voice' && <Phone className="w-3 h-3" />}
                          {session.type === 'video' && <Video className="w-3 h-3" />}
                          <span>{formatDuration(session.duration)}</span>
                          <span>•</span>
                          <span>{formatCurrency(session.earnings)}</span>
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
                <p className="text-slate-400 mb-4">No sessions yet</p>
                <p className="text-sm text-slate-500">
                  Go online and available to start receiving reading requests
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Earnings Chart */}
      <Card variant="mystical">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Weekly Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-mystical-pink-500 border-t-transparent rounded-full" />
            </div>
          ) : weeklyEarnings && weeklyEarnings.length > 0 ? (
            <div className="space-y-4">
              {weeklyEarnings.map((day) => (
                <div key={day.day} className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm w-20">{day.day}</span>
                  <div className="flex-1 mx-4">
                    <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-mystical-pink-500 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(5, (day.amount / Math.max(...weeklyEarnings.map(d => d.amount), 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-white font-medium w-20 text-right">
                    {formatCurrency(day.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No earnings data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/reader/pricing">
          <Card variant="mystical" className="cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <DollarSign className="w-12 h-12 text-mystical-gold-500 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">Update Pricing</h3>
              <p className="text-slate-400 text-sm">Adjust your per-minute rates</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reader/schedule">
          <Card variant="mystical" className="cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-mystical-pink-500 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">Manage Schedule</h3>
              <p className="text-slate-400 text-sm">Set your availability hours</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reader/profile">
          <Card variant="mystical" className="cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-mystical-pink-500 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">Edit Profile</h3>
              <p className="text-slate-400 text-sm">Update bio and specialties</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
