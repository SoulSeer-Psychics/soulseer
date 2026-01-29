import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3,
  Users,
  DollarSign,
  Shield,
  AlertTriangle,
  TrendingUp,
  Clock,
  MessageSquare,
  Star,
  Eye,
  UserPlus,
  Settings,
  FileText,
  CreditCard,
  Activity,
  Bell,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { useApi } from '@/lib/hooks';

interface AdminDashboardProps {
  user: any;
}

interface PlatformStats {
  totalUsers: number;
  totalReaders: number;
  totalClients: number;
  activeReadings: number;
  totalRevenue: number;
  readerRevenue: number;
  platformRevenue: number;
  averageSessionDuration: number;
  totalSessions: number;
  averageRating: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registered' | 'session_completed' | 'payment_processed' | 'reader_applied' | 'dispute_created';
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: any;
}

interface PendingAction {
  id: string;
  type: 'reader_application' | 'dispute_resolution' | 'content_moderation' | 'refund_request';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [dateRange, setDateRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  const { data: platformStats, loading: statsLoading, refetch: refetchStats } = useApi<PlatformStats>(
    `/api/admin/stats?range=${dateRange}`
  );

  const { data: recentActivity, loading: activityLoading } = useApi<RecentActivity[]>(
    '/api/admin/activity/recent?limit=10'
  );

  const { data: pendingActions, loading: actionsLoading } = useApi<PendingAction[]>(
    '/api/admin/pending-actions'
  );

  const { data: revenueChart, loading: chartLoading } = useApi<Array<{ date: string; revenue: number; sessions: number }>>(
    `/api/admin/charts/revenue?range=${dateRange}`
  );

  const { data: topReaders, loading: readersLoading } = useApi<Array<{
    id: string;
    displayName: string;
    profileImage?: string;
    totalSessions: number;
    totalRevenue: number;
    rating: number;
  }>>('/api/admin/readers/top?limit=5');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  };

  const overviewCards = [
    {
      title: 'Total Users',
      value: platformStats?.totalUsers || 0,
      change: '+12%',
      positive: true,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Active Readers',
      value: platformStats?.totalReaders || 0,
      change: '+5%',
      positive: true,
      icon: Star,
      color: 'text-mystical-pink-500',
    },
    {
      title: 'Platform Revenue',
      value: formatCurrency(platformStats?.platformRevenue || 0),
      change: '+18%',
      positive: true,
      icon: DollarSign,
      color: 'text-mystical-gold-500',
    },
    {
      title: 'Active Readings',
      value: platformStats?.activeReadings || 0,
      change: '+8%',
      positive: true,
      icon: Activity,
      color: 'text-green-500',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-slate-400';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'cosmic';
      default: return 'mystical';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registered': return UserPlus;
      case 'session_completed': return MessageSquare;
      case 'payment_processed': return CreditCard;
      case 'reader_applied': return Star;
      case 'dispute_created': return AlertTriangle;
      default: return Bell;
    }
  };

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-alex-brush text-mystical-pink-500 mb-2">
            Platform Overview
          </h1>
          <p className="text-slate-300">
            Manage users, monitor performance, and oversee platform operations.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          
          <Button onClick={handleRefresh} loading={refreshing} variant="ghost">
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <Link href="/admin/settings">
            <Button variant="ghost">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card, index) => (
          <Card key={index} variant="mystical">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <card.icon className={`w-6 h-6 ${card.color}`} />
                <span className={`text-xs flex items-center ${
                  card.positive ? 'text-green-500' : 'text-red-500'
                }`}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {card.change}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white">{card.value}</div>
                <div className="text-xs text-slate-400">{card.title}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart & Platform Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card variant="mystical" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Revenue Trend
              </span>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-mystical-pink-500 border-t-transparent rounded-full" />
              </div>
            ) : revenueChart && revenueChart.length > 0 ? (
              <div className="space-y-4">
                {revenueChart.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm w-24">
                      {new Date(day.date).toLocaleDateString()}
                    </span>
                    <div className="flex-1 mx-4">
                      <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-mystical-pink-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(5, (day.revenue / Math.max(...revenueChart.map(d => d.revenue), 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {formatCurrency(day.revenue)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {day.sessions} sessions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Health */}
        <Card variant="mystical">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">System Uptime</span>
                <span className="text-green-400 font-medium">99.9%</span>
              </div>
              <Progress value={99.9} variant="success" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Average Response</span>
                <span className="text-mystical-gold-400 font-medium">120ms</span>
              </div>
              <Progress value={85} variant="cosmic" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Storage Usage</span>
                <span className="text-mystical-pink-400 font-medium">67%</span>
              </div>
              <Progress value={67} variant="mystical" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Active Connections</span>
                <span className="text-blue-400 font-medium">1,247</span>
              </div>
              <Progress value={78} variant="default" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Actions */}
        <Card variant="mystical">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Pending Actions
                {pendingActions && pendingActions.length > 0 && (
                  <Badge variant="warning" className="ml-2">
                    {pendingActions.length}
                  </Badge>
                )}
              </span>
              <Link href="/admin/actions">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {actionsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : pendingActions && pendingActions.length > 0 ? (
              <div className="space-y-4">
                {pendingActions.slice(0, 5).map((action) => (
                  <div key={action.id} className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white text-sm">{action.title}</h4>
                      <Badge variant={getPriorityVariant(action.priority) as any} className="text-xs">
                        {action.priority}
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-xs mb-2 line-clamp-2">
                      {action.description}
                    </p>
                    <div className="text-xs text-slate-500">
                      {formatRelativeTime(action.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No pending actions</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card variant="mystical">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Activity
              </span>
              <Link href="/admin/activity">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-8 h-8 bg-slate-700 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-700 rounded w-3/4" />
                      <div className="h-2 bg-slate-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {recentActivity.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`p-1.5 rounded-full ${getActivityColor(activity.severity)} bg-slate-800`}>
                        <ActivityIcon className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300">{activity.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Readers */}
      <Card variant="mystical">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Star className="w-5 h-5 mr-2" />
              Top Performing Readers
            </span>
            <Link href="/admin/readers">
              <Button variant="ghost" size="sm">
                Manage All
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readersLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 animate-pulse">
                  <div className="w-10 h-10 bg-slate-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-1/2" />
                    <div className="h-3 bg-slate-700 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : topReaders && topReaders.length > 0 ? (
            <div className="space-y-4">
              {topReaders.map((reader, index) => (
                <div key={reader.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar size="sm">
                        <AvatarImage src={reader.profileImage} />
                        <AvatarFallback>
                          {reader.displayName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -left-1 w-5 h-5 bg-mystical-gold-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-white">{reader.displayName}</div>
                      <div className="flex items-center space-x-2 text-sm text-slate-400">
                        <Star className="w-3 h-3 fill-mystical-gold-500 text-mystical-gold-500" />
                        <span>{reader.rating.toFixed(1)}</span>
                        <span>•</span>
                        <span>{reader.totalSessions} sessions</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-mystical-gold-400 font-medium">
                      {formatCurrency(reader.totalRevenue)}
                    </div>
                    <div className="text-xs text-slate-500">Revenue</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No reader data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/admin/users">
          <Card variant="mystical" className="cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">Manage Users</h3>
              <p className="text-slate-400 text-sm">View and manage all users</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/readers/create">
          <Card variant="mystical" className="cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <UserPlus className="w-12 h-12 text-mystical-pink-500 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">Add Reader</h3>
              <p className="text-slate-400 text-sm">Create new reader account</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/moderation">
          <Card variant="mystical" className="cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <Shield className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">Content Review</h3>
              <p className="text-slate-400 text-sm">Moderate platform content</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/reports">
          <Card variant="mystical" className="cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 text-mystical-gold-500 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">Reports</h3>
              <p className="text-slate-400 text-sm">Download platform reports</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
