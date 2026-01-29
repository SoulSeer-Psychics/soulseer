import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { 
  MessageCircle, 
  Phone, 
  Video, 
  Clock, 
  DollarSign, 
  AlertCircle,
  Star,
  Shield,
  CreditCard,
  ArrowLeft,
  CheckCircle,
  Heart
} from 'lucide-react';
import { ReadingLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { useApi, useClientBalance, useReadingSession } from '@/lib/hooks';
import AddFundsDialog from '@/components/features/add-funds-dialog';
import { ReadingSession } from '@/components/features/reading-session';
import Link from 'next/link';

export default function ReadingStartPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  
  const readerId = searchParams?.get('readerId');
  const sessionType = searchParams?.get('type') as 'chat' | 'voice' | 'video' || 'chat';
  
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(10); // Default 10 minutes

  const { balance, loading: balanceLoading, refetch: refetchBalance } = useClientBalance();
  const { startSession } = useReadingSession();

  const { data: reader, loading: readerLoading } = useApi<any>(
    readerId ? `/api/readers/${readerId}` : null
  );

  // Redirect if no reader ID
  useEffect(() => {
    if (!readerId) {
      router.push('/readings');
    }
  }, [readerId, router]);

  // Calculate estimated cost when reader data loads
  useEffect(() => {
    if (reader && sessionType) {
      const ratePerMinute = reader.pricing[sessionType] || 0;
      setEstimatedCost(ratePerMinute * selectedDuration);
    }
  }, [reader, sessionType, selectedDuration]);

  if (!user) {
    return (
      <ReadingLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-alex-brush text-mystical-pink-500 mb-4">
            Sign In Required
          </h1>
          <p className="text-slate-300 mb-8">
            Please sign in to start a reading session.
          </p>
          <Link href="/sign-in">
            <Button variant="default">Sign In</Button>
          </Link>
        </div>
      </ReadingLayout>
    );
  }

  if (readerLoading || !reader) {
    return (
      <ReadingLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-mystical-pink-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-300">Loading reader information...</p>
        </div>
      </ReadingLayout>
    );
  }

  // If session is active, show the reading interface
  if (currentSession) {
    return (
      <ReadingSession
        sessionId={currentSession.id}
        onSessionEnd={() => {
          setCurrentSession(null);
          router.push('/dashboard');
        }}
      />
    );
  }

  const handleStartReading = async () => {
    if (!reader || !sessionType) return;

    // Check balance
    const currentBalance = balance ? parseFloat(balance.balance) : 0;
    const ratePerMinute = reader.pricing[sessionType];
    const minimumRequired = ratePerMinute * 2; // Require at least 2 minutes

    if (currentBalance < minimumRequired) {
      setShowAddFunds(true);
      return;
    }

    setIsStarting(true);
    
    try {
      const session = await startSession(readerId!, sessionType);
      setCurrentSession(session);
    } catch (error) {
      console.error('Failed to start session:', error);
      setIsStarting(false);
    }
  };

  const handleAddFunds = async () => {
    setShowAddFunds(false);
    await refetchBalance();
  };

  const getSessionTypeIcon = () => {
    switch (sessionType) {
      case 'voice': return Phone;
      case 'video': return Video;
      default: return MessageCircle;
    }
  };

  const getSessionTypeLabel = () => {
    switch (sessionType) {
      case 'voice': return 'Voice Call';
      case 'video': return 'Video Call';
      default: return 'Chat Session';
    }
  };

  const SessionTypeIcon = getSessionTypeIcon();
  const currentBalance = balance ? parseFloat(balance.balance) : 0;
  const ratePerMinute = reader.pricing[sessionType] || 0;
  const minimumRequired = ratePerMinute * 2;
  const hasInsufficientFunds = currentBalance < minimumRequired;

  return (
    <ReadingLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <div className="mb-6">
          <Link href={`/readers/${readerId}`}>
            <Button variant="ghost" className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Profile</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reader Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reader Card */}
            <Card variant="cosmic" glow>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="relative">
                    <Avatar size="xl" glow={reader.isOnline}>
                      <AvatarImage src={reader.profileImage} />
                      <AvatarFallback>
                        {reader.displayName?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {reader.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-slate-800 rounded-full" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h1 className="text-2xl font-alex-brush text-mystical-pink-400">
                        {reader.displayName}
                      </h1>
                      <div className="flex items-center space-x-2">
                        <Badge variant={reader.isOnline && reader.isAvailable ? 'online' : 'busy'}>
                          {reader.isOnline && reader.isAvailable ? 'Available' : 'Busy'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(reader.rating)
                                ? 'fill-mystical-gold-500 text-mystical-gold-500'
                                : 'text-slate-600'
                            }`}
                          />
                        ))}
                        <span className="text-slate-300 ml-2">
                          {reader.rating.toFixed(1)} ({reader.totalReviews} reviews)
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-slate-300 mb-4 line-clamp-3">
                      {reader.bio}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {reader.specialties?.slice(0, 3).map((specialty: string) => (
                        <Badge key={specialty} variant="mystical">
                          {specialty}
                        </Badge>
                      ))}
                      {reader.specialties?.length > 3 && (
                        <Badge variant="cosmic">
                          +{reader.specialties.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Type Selection */}
            <Card variant="mystical">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SessionTypeIcon className="w-5 h-5 mr-2" />
                  {getSessionTypeLabel()} Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <Link 
                    href={`/readings/start?readerId=${readerId}&type=chat`}
                    className={sessionType === 'chat' ? 'pointer-events-none' : ''}
                  >
                    <div className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      sessionType === 'chat' 
                        ? 'border-mystical-pink-500 bg-mystical-pink-500/10' 
                        : 'border-slate-600 hover:border-slate-500'
                    }`}>
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 text-mystical-pink-500" />
                      <div className="text-sm font-medium text-white">Chat</div>
                      <div className="text-xs text-slate-400">
                        {formatCurrency(reader.pricing.chat)}/min
                      </div>
                    </div>
                  </Link>
                  
                  <Link 
                    href={`/readings/start?readerId=${readerId}&type=voice`}
                    className={sessionType === 'voice' ? 'pointer-events-none' : ''}
                  >
                    <div className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      sessionType === 'voice' 
                        ? 'border-mystical-pink-500 bg-mystical-pink-500/10' 
                        : 'border-slate-600 hover:border-slate-500'
                    }`}>
                      <Phone className="w-8 h-8 mx-auto mb-2 text-mystical-pink-500" />
                      <div className="text-sm font-medium text-white">Voice</div>
                      <div className="text-xs text-slate-400">
                        {formatCurrency(reader.pricing.voice)}/min
                      </div>
                    </div>
                  </Link>
                  
                  <Link 
                    href={`/readings/start?readerId=${readerId}&type=video`}
                    className={sessionType === 'video' ? 'pointer-events-none' : ''}
                  >
                    <div className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      sessionType === 'video' 
                        ? 'border-mystical-pink-500 bg-mystical-pink-500/10' 
                        : 'border-slate-600 hover:border-slate-500'
                    }`}>
                      <Video className="w-8 h-8 mx-auto mb-2 text-mystical-pink-500" />
                      <div className="text-sm font-medium text-white">Video</div>
                      <div className="text-xs text-slate-400">
                        {formatCurrency(reader.pricing.video)}/min
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Session Benefits */}
                <div className="bg-cosmic-800/50 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">What's Included:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Personalized guidance and insights</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Private and confidential session</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Secure end-to-end encryption</span>
                    </div>
                    {sessionType === 'chat' && (
                      <div className="flex items-center space-x-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Chat transcript saved for review</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div>
            <Card variant="cosmic" glow className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Balance */}
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">Your Balance</span>
                    <span className="text-mystical-gold-400 font-medium">
                      {formatCurrency(currentBalance)}
                    </span>
                  </div>
                  {hasInsufficientFunds && (
                    <div className="flex items-center space-x-2 text-yellow-400 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      <span>Insufficient funds</span>
                    </div>
                  )}
                </div>

                {/* Session Details */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Session Type</span>
                    <span className="text-white">{getSessionTypeLabel()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Rate per minute</span>
                    <span className="text-white">{formatCurrency(ratePerMinute)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Minimum required</span>
                    <span className="text-white">{formatCurrency(minimumRequired)}</span>
                  </div>
                </div>

                {/* Duration Estimator */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-200">
                    Estimate your session
                  </label>
                  <select
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(parseInt(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                  >
                    <option value={5}>5 minutes - {formatCurrency(ratePerMinute * 5)}</option>
                    <option value={10}>10 minutes - {formatCurrency(ratePerMinute * 10)}</option>
                    <option value={15}>15 minutes - {formatCurrency(ratePerMinute * 15)}</option>
                    <option value={30}>30 minutes - {formatCurrency(ratePerMinute * 30)}</option>
                    <option value={60}>60 minutes - {formatCurrency(ratePerMinute * 60)}</option>
                  </select>
                  <p className="text-xs text-slate-500">
                    You'll only pay for the actual time used
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {hasInsufficientFunds ? (
                    <Button 
                      onClick={() => setShowAddFunds(true)}
                      className="w-full"
                      variant="secondary"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Add Funds
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStartReading}
                      loading={isStarting}
                      disabled={!reader.isOnline || !reader.isAvailable}
                      className="w-full"
                    >
                      {isStarting ? 'Connecting...' : (
                        <>
                          <SessionTypeIcon className="w-4 h-4 mr-2" />
                          Start {getSessionTypeLabel()}
                        </>
                      )}
                    </Button>
                  )}
                  
                  {!reader.isOnline || !reader.isAvailable ? (
                    <p className="text-center text-sm text-yellow-400">
                      {!reader.isOnline ? 'Reader is currently offline' : 'Reader is currently busy'}
                    </p>
                  ) : null}
                </div>

                {/* Security Notice */}
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-green-500 mt-0.5" />
                    <div className="text-xs text-slate-400">
                      <p className="font-medium text-green-400 mb-1">100% Secure</p>
                      <p>All sessions are encrypted and confidential. You can end the session at any time.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Funds Dialog */}
        <AddFundsDialog
          open={showAddFunds}
          onClose={() => setShowAddFunds(false)}
          onSuccess={handleAddFunds}
          currentBalance={currentBalance}
        />
      </div>
    </ReadingLayout>
  );
}
