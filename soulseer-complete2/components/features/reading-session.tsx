import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, 
  Phone, 
  Video, 
  PhoneOff, 
  VideoOff, 
  Mic, 
  MicOff, 
  Send, 
  Clock,
  DollarSign,
  X,
  Star,
  Heart,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { useReadingSession, useClientBalance } from '@/lib/hooks';
import { agoraService } from '@/lib/agora';
import { ablyService } from '@/lib/ably';
import { cn } from '@/lib/utils';

interface ReadingSessionProps {
  sessionId?: string;
  readerId?: string;
  sessionType?: 'chat' | 'voice' | 'video';
  onSessionEnd?: () => void;
  onSessionStart?: (session: any) => void;
}

interface Message {
  id: string;
  type: 'text' | 'image' | 'system';
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  isRead?: boolean;
}

export function ReadingSession({
  sessionId,
  readerId,
  sessionType = 'chat',
  onSessionEnd,
  onSessionStart,
}: ReadingSessionProps) {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentCost, setCurrentCost] = useState(0);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const durationTimerRef = useRef<NodeJS.Timeout>();

  // Hooks
  const { session, loading, startSession, endSession } = useReadingSession(sessionId);
  const { balance, refetch: refetchBalance } = useClientBalance();

  // Initialize session if starting new one
  useEffect(() => {
    if (!sessionId && readerId && sessionType) {
      handleStartSession();
    }
  }, [readerId, sessionType, sessionId]);

  // Setup duration timer
  useEffect(() => {
    if (session?.status === 'active') {
      durationTimerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
        
        // Calculate current cost
        const minutes = Math.ceil((duration + 1) / 60);
        const rate = session.ratePerMinute;
        setCurrentCost(minutes * rate);
      }, 1000);

      return () => {
        if (durationTimerRef.current) {
          clearInterval(durationTimerRef.current);
        }
      };
    }
  }, [session, duration]);

  // Setup real-time communication
  useEffect(() => {
    if (session && session.agoraChannelName) {
      setupAgoraConnection();
    }
    if (session && session.ablyChannelName) {
      setupAblyConnection();
    }

    return () => {
      cleanup();
    };
  }, [session]);

  // Auto-scroll messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartSession = async () => {
    if (!readerId || !sessionType) return;

    try {
      const newSession = await startSession(readerId, sessionType);
      onSessionStart?.(newSession);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession(rating > 0 ? rating : undefined, review || undefined);
      cleanup();
      onSessionEnd?.();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const setupAgoraConnection = async () => {
    if (!session?.agoraChannelName || !session?.agoraToken) return;

    try {
      // Setup event listeners
      agoraService.onUserJoined = (uid) => {
        addSystemMessage('Reader joined the session');
      };

      agoraService.onUserLeft = (uid) => {
        addSystemMessage('Reader left the session');
      };

      // Join channel
      await agoraService.joinChannel(
        session.agoraToken,
        session.agoraChannelName,
        session.clientId || 'client',
        'host'
      );

      if (sessionType === 'voice' || sessionType === 'video') {
        await enableAudio();
      }

      if (sessionType === 'video') {
        await enableVideo();
      }

      setIsConnected(true);
    } catch (error) {
      console.error('Failed to setup Agora connection:', error);
    }
  };

  const setupAblyConnection = async () => {
    if (!session?.ablyChannelName) return;

    try {
      const { channel, sendMessage } = await ablyService.joinReadingSession(
        session.id,
        session.clientId,
        {
          name: 'Client',
          role: 'client',
        }
      );

      // Listen for messages
      await channel.subscribe('message', (message) => {
        setMessages(prev => [...prev, message.data]);
      });

      // Store send function for later use
      (window as any).sendAblyMessage = sendMessage;
    } catch (error) {
      console.error('Failed to setup Ably connection:', error);
    }
  };

  const enableVideo = async () => {
    try {
      const videoTrack = await agoraService.enableVideo();
      if (localVideoRef.current) {
        agoraService.playLocalVideo(localVideoRef.current);
      }
      setIsVideoEnabled(true);
    } catch (error) {
      console.error('Failed to enable video:', error);
    }
  };

  const disableVideo = async () => {
    try {
      await agoraService.disableVideo();
      setIsVideoEnabled(false);
    } catch (error) {
      console.error('Failed to disable video:', error);
    }
  };

  const enableAudio = async () => {
    try {
      await agoraService.enableAudio();
      setIsAudioEnabled(true);
    } catch (error) {
      console.error('Failed to enable audio:', error);
    }
  };

  const disableAudio = async () => {
    try {
      await agoraService.disableAudio();
      setIsAudioEnabled(false);
    } catch (error) {
      console.error('Failed to disable audio:', error);
    }
  };

  const toggleMute = async () => {
    try {
      await agoraService.muteAudio(!isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !(window as any).sendAblyMessage) return;

    try {
      await (window as any).sendAblyMessage({
        type: 'text',
        content: newMessage,
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      type: 'system',
      content,
      senderId: 'system',
      senderName: 'System',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const cleanup = async () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }
    
    try {
      await agoraService.leaveChannel();
      // Cleanup Ably connection would go here
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-mystical-pink-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-300">Connecting to your reader...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-cosmic-950">
      {/* Session Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {session?.reader && (
              <>
                <Avatar size="md">
                  <AvatarImage src={session.reader.profileImage} />
                  <AvatarFallback>
                    {session.reader.displayName?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-alex-brush text-xl text-mystical-pink-400">
                    {session.reader.displayName}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Badge variant="online">Connected</Badge>
                    <Badge variant="mystical">
                      {sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Duration & Cost */}
            <div className="text-right">
              <div className="flex items-center space-x-2 text-sm text-slate-300">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(duration)}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-mystical-gold-400">
                <DollarSign className="w-4 h-4" />
                <span>{formatCurrency(currentCost)}</span>
              </div>
            </div>

            {/* End Session Button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowEndDialog(true)}
              className="flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>End Session</span>
            </Button>
          </div>
        </div>

        {/* Balance Warning */}
        {balance && parseFloat(balance.balance) < currentCost + 5 && (
          <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <div className="flex items-center space-x-2 text-yellow-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>
                Low balance warning: Please add funds to continue your session
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video/Audio Area */}
        {(sessionType === 'video' || sessionType === 'voice') && (
          <div className="w-1/2 bg-cosmic-900 p-4">
            {sessionType === 'video' && (
              <div className="space-y-4">
                {/* Remote Video */}
                <div 
                  ref={remoteVideoRef}
                  className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center"
                >
                  <p className="text-slate-400">Waiting for reader's video...</p>
                </div>

                {/* Local Video */}
                <div 
                  ref={localVideoRef}
                  className="aspect-video bg-slate-700 rounded-lg w-48"
                />
              </div>
            )}

            {/* Audio Controls */}
            <div className="mt-4 flex justify-center space-x-4">
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="lg"
                onClick={toggleMute}
                className="rounded-full"
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              
              {sessionType === 'video' && (
                <Button
                  variant={isVideoEnabled ? "secondary" : "destructive"}
                  size="lg"
                  onClick={isVideoEnabled ? disableVideo : enableVideo}
                  className="rounded-full"
                >
                  {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className={cn(
          "flex flex-col bg-slate-900",
          sessionType === 'chat' ? 'flex-1' : 'w-1/2'
        )}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.type === 'system' ? 'justify-center' : 
                  message.senderId === session?.clientId ? 'justify-end' : 'justify-start'
                )}
              >
                {message.type === 'system' ? (
                  <div className="bg-slate-700/50 text-slate-400 text-xs px-3 py-1 rounded-full">
                    {message.content}
                  </div>
                ) : (
                  <div 
                    className={cn(
                      "max-w-xs lg:max-w-md px-4 py-2 rounded-2xl",
                      message.senderId === session?.clientId
                        ? 'bg-mystical-pink-500 text-white'
                        : 'bg-slate-700 text-slate-100'
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {formatMessageTime(message.timestamp)}
                    </p>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex space-x-3">
              <Input
                variant="mystical"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* End Session Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent variant="mystical" className="max-w-md">
          <DialogHeader>
            <DialogTitle>End Reading Session</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-slate-300 mb-2">
                Your session lasted {formatDuration(duration)}
              </p>
              <p className="text-lg font-medium">
                Total Cost: <span className="text-mystical-gold-400">{formatCurrency(currentCost)}</span>
              </p>
            </div>

            {/* Rating */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-200">
                Rate your experience
              </label>
              <div className="flex justify-center space-x-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setRating(i + 1)}
                    className="p-1"
                  >
                    <Star
                      className={cn(
                        'w-6 h-6 transition-colors',
                        i < rating ? 'fill-mystical-gold-500 text-mystical-gold-500' : 'text-slate-600'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                Leave a review (optional)
              </label>
              <Textarea
                variant="mystical"
                placeholder="Share your experience..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <Button
                variant="ghost"
                onClick={() => setShowEndDialog(false)}
                className="flex-1"
              >
                Continue Session
              </Button>
              <Button
                variant="destructive"
                onClick={handleEndSession}
                loading={isSubmittingReview}
                className="flex-1"
              >
                End Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
