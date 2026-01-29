import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import AgoraRTC, { IAgoraRTCRemoteUser, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { 
  Heart, 
  Gift, 
  MessageSquare, 
  Users, 
  Settings, 
  Volume2, 
  VolumeX,
  Maximize2,
  Minimize2,
  Share2,
  Flag,
  Sparkles,
  DollarSign,
  Send,
  Smile,
  Star,
  X
} from 'lucide-react';
import { ReadingLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { useApi } from '@/lib/hooks';
import { toast } from 'sonner';

interface LiveStreamData {
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
  startedAt: string;
  category: string;
  isPrivate: boolean;
  isPremium: boolean;
  price?: number;
  agoraChannelName: string;
  agoraToken: string;
}

interface ChatMessage {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    isReader?: boolean;
    isModerator?: boolean;
  };
  message: string;
  timestamp: string;
  type: 'message' | 'gift' | 'join' | 'leave';
  giftData?: {
    name: string;
    value: number;
    animation: string;
  };
}

interface VirtualGift {
  id: string;
  name: string;
  price: number;
  animation: string;
  icon: string;
}

const VIRTUAL_GIFTS: VirtualGift[] = [
  { id: '1', name: 'Crystal Ball', price: 1.99, animation: 'sparkle', icon: '🔮' },
  { id: '2', name: 'Tarot Cards', price: 4.99, animation: 'cards', icon: '🃏' },
  { id: '3', name: 'Moon Blessing', price: 9.99, animation: 'moon', icon: '🌙' },
  { id: '4', name: 'Star Power', price: 19.99, animation: 'stars', icon: '⭐' },
  { id: '5', name: 'Divine Light', price: 49.99, animation: 'divine', icon: '✨' },
];

export default function LiveStreamPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const streamId = params?.id as string;

  // Agora state
  const [agoraClient] = useState(() => AgoraRTC.createClient({ mode: 'live', codec: 'vp8' }));
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);

  // UI state
  const [isJoined, setIsJoined] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showGifts, setShowGifts] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isLiked, setIsLiked] = useState(false);

  // Data
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [streamData, setStreamData] = useState<LiveStreamData | null>(null);

  const videoRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: stream, loading: streamLoading } = useApi<LiveStreamData>(
    streamId ? `/api/live/streams/${streamId}` : null
  );

  // Initialize Agora when stream data loads
  useEffect(() => {
    if (!stream || !user || isJoined) return;

    const initializeAgora = async () => {
      try {
        setStreamData(stream);

        // Join as audience
        agoraClient.setClientRole('audience');
        
        await agoraClient.join(
          process.env.NEXT_PUBLIC_AGORA_APP_ID!,
          stream.agoraChannelName,
          stream.agoraToken,
          user.id
        );

        setIsJoined(true);

        // Listen for remote users
        agoraClient.on('user-published', async (remoteUser, mediaType) => {
          await agoraClient.subscribe(remoteUser, mediaType);
          
          if (mediaType === 'video' && videoRef.current) {
            remoteUser.videoTrack?.play(videoRef.current);
          }
          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play();
          }

          setRemoteUsers(prev => [...prev.filter(u => u.uid !== remoteUser.uid), remoteUser]);
        });

        agoraClient.on('user-unpublished', (remoteUser) => {
          setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
        });

        // Send join message to chat
        await sendChatMessage('', 'join');

      } catch (error) {
        console.error('Failed to join stream:', error);
        toast.error('Failed to join stream');
      }
    };

    initializeAgora();

    return () => {
      if (isJoined) {
        agoraClient.leave();
        setIsJoined(false);
      }
    };
  }, [stream, user, isJoined, agoraClient]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChatMessage = async (message: string, type: 'message' | 'join' | 'gift' = 'message') => {
    if (!user || !stream) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: {
        id: user.id,
        name: user.firstName || 'Anonymous',
        avatar: user.imageUrl,
      },
      message: message || (type === 'join' ? 'joined the stream' : ''),
      timestamp: new Date().toISOString(),
      type,
    };

    setChatMessages(prev => [...prev, newMessage]);

    // Send to backend via WebSocket or API
    try {
      await fetch(`/api/live/streams/${streamId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type }),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendChatMessage(chatMessage);
      setChatMessage('');
    }
  };

  const handleSendGift = async (gift: VirtualGift) => {
    try {
      const response = await fetch(`/api/live/streams/${streamId}/gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId: gift.id }),
      });

      if (response.ok) {
        const giftMessage: ChatMessage = {
          id: Date.now().toString(),
          user: {
            id: user!.id,
            name: user!.firstName || 'Anonymous',
            avatar: user!.imageUrl,
          },
          message: `sent a ${gift.name}`,
          timestamp: new Date().toISOString(),
          type: 'gift',
          giftData: {
            name: gift.name,
            value: gift.price,
            animation: gift.animation,
          },
        };

        setChatMessages(prev => [...prev, giftMessage]);
        setShowGifts(false);
        toast.success(`Sent ${gift.name}!`);
      } else {
        toast.error('Failed to send gift');
      }
    } catch (error) {
      console.error('Failed to send gift:', error);
      toast.error('Failed to send gift');
    }
  };

  const handleToggleLike = async () => {
    setIsLiked(!isLiked);
    // Send to backend
    try {
      await fetch(`/api/live/streams/${streamId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: !isLiked }),
      });
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleShare = () => {
    navigator.share?.({
      title: stream?.title,
      url: window.location.href,
    }) || navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  if (!user) {
    return (
      <ReadingLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-alex-brush text-mystical-pink-500 mb-4">
            Sign In Required
          </h1>
          <p className="text-slate-300 mb-8">
            Please sign in to watch live streams.
          </p>
          <Button onClick={() => router.push('/sign-in')}>
            Sign In
          </Button>
        </div>
      </ReadingLayout>
    );
  }

  if (streamLoading || !stream) {
    return (
      <ReadingLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-mystical-pink-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-300">Loading stream...</p>
        </div>
      </ReadingLayout>
    );
  }

  return (
    <ReadingLayout variant="cosmic">
      <div className="min-h-screen bg-cosmic-900">
        <div className="grid grid-cols-1 lg:grid-cols-4 h-screen">
          {/* Video Player */}
          <div className="lg:col-span-3 relative bg-black">
            <div 
              ref={videoRef}
              className={`w-full h-full ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}`}
              style={{ aspectRatio: '16/9' }}
            />

            {/* Stream Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top Bar */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                  <Badge variant="live" className="animate-pulse mb-2">
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                    LIVE
                  </Badge>
                  <div className="flex items-center space-x-2 text-white">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{stream.viewerCount}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMuted(!isMuted)}
                    className="bg-black/50 backdrop-blur-sm text-white hover:bg-white/20"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="bg-black/50 backdrop-blur-sm text-white hover:bg-white/20"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="bg-black/50 backdrop-blur-sm text-white hover:bg-white/20"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-auto">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 max-w-md">
                  <div className="flex items-center space-x-3 mb-2">
                    <Avatar size="sm">
                      <AvatarImage src={stream.reader.profileImage} />
                      <AvatarFallback>
                        {stream.reader.displayName.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-white font-medium">{stream.reader.displayName}</div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-mystical-gold-500 text-mystical-gold-500" />
                        <span className="text-xs text-slate-300">{stream.reader.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <h2 className="text-white font-medium mb-1">{stream.title}</h2>
                  <Badge variant="mystical" className="text-xs">{stream.category}</Badge>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant={isLiked ? 'default' : 'ghost'}
                    size="sm"
                    onClick={handleToggleLike}
                    className={`bg-black/50 backdrop-blur-sm ${isLiked ? 'text-red-500' : 'text-white'} hover:bg-white/20`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGifts(true)}
                    className="bg-black/50 backdrop-blur-sm text-white hover:bg-white/20"
                  >
                    <Gift className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChat(!showChat)}
                    className="bg-black/50 backdrop-blur-sm text-white hover:bg-white/20 lg:hidden"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className={`bg-slate-900 border-l border-slate-700 flex flex-col ${showChat ? 'block' : 'hidden lg:flex'}`}>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Live Chat</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(false)}
                  className="lg:hidden"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="flex items-start space-x-2 text-sm">
                  <Avatar size="sm" className="flex-shrink-0">
                    <AvatarImage src={msg.user.avatar} />
                    <AvatarFallback>{msg.user.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className={`font-medium ${
                        msg.user.isReader ? 'text-mystical-pink-400' : 'text-white'
                      }`}>
                        {msg.user.name}
                      </span>
                      {msg.user.isReader && (
                        <Badge variant="mystical" className="text-xs px-1 py-0">
                          Reader
                        </Badge>
                      )}
                    </div>
                    
                    {msg.type === 'gift' && msg.giftData ? (
                      <div className="bg-mystical-pink-500/20 border border-mystical-pink-500/30 rounded p-2 mt-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{VIRTUAL_GIFTS.find(g => g.name === msg.giftData?.name)?.icon}</span>
                          <div>
                            <div className="text-mystical-pink-400 font-medium">{msg.giftData.name}</div>
                            <div className="text-xs text-slate-400">{formatCurrency(msg.giftData.value)}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`text-slate-300 break-words ${
                        msg.type === 'join' ? 'text-slate-500 italic' : ''
                      }`}>
                        {msg.message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-slate-700">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  variant="mystical"
                  placeholder="Send a message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={!chatMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Virtual Gifts Dialog */}
        <Dialog open={showGifts} onOpenChange={setShowGifts}>
          <DialogContent variant="cosmic" className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Gift className="w-5 h-5 mr-2" />
                Send a Gift
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {VIRTUAL_GIFTS.map((gift) => (
                <Card
                  key={gift.id}
                  variant="mystical"
                  className="cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => handleSendGift(gift)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{gift.icon}</div>
                    <div className="font-medium text-white text-sm">{gift.name}</div>
                    <div className="text-mystical-gold-400 font-bold">
                      {formatCurrency(gift.price)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ReadingLayout>
  );
}
