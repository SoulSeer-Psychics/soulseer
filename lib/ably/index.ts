import Ably from 'ably';

if (!process.env.NEXT_PUBLIC_ABLY_KEY) {
  throw new Error('NEXT_PUBLIC_ABLY_KEY is not set');
}

// Ably client instance
export const ably = new Ably.Realtime({
  key: process.env.NEXT_PUBLIC_ABLY_KEY,
  clientId: typeof window !== 'undefined' ? `client-${Date.now()}` : undefined,
  echoMessages: false,
});

// Message types
export interface ChatMessage {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'system';
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  isRead?: boolean;
}

export interface SystemMessage {
  type: 'user_joined' | 'user_left' | 'session_started' | 'session_ended' | 'gift_sent' | 'status_update';
  data: Record<string, any>;
  timestamp: string;
}

export interface PresenceData {
  userId: string;
  username: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: string;
}

export class AblyService {
  private channels: Map<string, Ably.Types.RealtimeChannelPromise> = new Map();
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.setupConnectionListeners();
  }

  private setupConnectionListeners() {
    ably.connection.on('connected', () => {
      this.isConnected = true;
      console.log('Ably connected');
      if (this.onConnected) {
        this.onConnected();
      }
    });

    ably.connection.on('disconnected', () => {
      this.isConnected = false;
      console.log('Ably disconnected');
      if (this.onDisconnected) {
        this.onDisconnected();
      }
    });

    ably.connection.on('failed', (error) => {
      this.isConnected = false;
      console.error('Ably connection failed:', error);
      if (this.onConnectionFailed) {
        this.onConnectionFailed(error);
      }
    });
  }

  // Connection event callbacks
  public onConnected?: () => void;
  public onDisconnected?: () => void;
  public onConnectionFailed?: (error: Ably.Types.ErrorInfo) => void;

  /**
   * Ensure connection is established
   */
  private async ensureConnection(): Promise<void> {
    if (this.isConnected) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      const onConnected = () => {
        clearTimeout(timeout);
        ably.connection.off('connected', onConnected);
        ably.connection.off('failed', onFailed);
        this.connectionPromise = null;
        resolve();
      };

      const onFailed = (error: Ably.Types.ErrorInfo) => {
        clearTimeout(timeout);
        ably.connection.off('connected', onConnected);
        ably.connection.off('failed', onFailed);
        this.connectionPromise = null;
        reject(error);
      };

      ably.connection.on('connected', onConnected);
      ably.connection.on('failed', onFailed);
    });

    return this.connectionPromise;
  }

  /**
   * Join a reading session channel
   */
  async joinReadingSession(
    sessionId: string,
    userId: string,
    userInfo: { name: string; avatar?: string; role: 'client' | 'reader' }
  ): Promise<{
    channel: Ably.Types.RealtimeChannelPromise;
    sendMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'senderId' | 'senderName' | 'senderAvatar'>) => Promise<void>;
    leave: () => Promise<void>;
  }> {
    await this.ensureConnection();

    const channelName = `reading-session:${sessionId}`;
    const channel = ably.channels.get(channelName);
    
    this.channels.set(channelName, channel);

    // Enter presence
    await channel.presence.enter({
      userId,
      username: userInfo.name,
      avatar: userInfo.avatar,
      role: userInfo.role,
      status: 'online',
    });

    const sendMessage = async (messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'senderId' | 'senderName' | 'senderAvatar'>) => {
      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        senderId: userId,
        senderName: userInfo.name,
        senderAvatar: userInfo.avatar,
        ...messageData,
      };

      await channel.publish('message', message);
    };

    const leave = async () => {
      await channel.presence.leave();
      await channel.detach();
      this.channels.delete(channelName);
    };

    return { channel, sendMessage, leave };
  }

  /**
   * Join a live stream channel
   */
  async joinLiveStream(
    streamId: string,
    userId: string,
    userInfo: { name: string; avatar?: string; role: 'viewer' | 'host' }
  ): Promise<{
    channel: Ably.Types.RealtimeChannelPromise;
    sendChatMessage: (message: string) => Promise<void>;
    sendGift: (gift: { type: string; quantity: number; message?: string }) => Promise<void>;
    leave: () => Promise<void>;
  }> {
    await this.ensureConnection();

    const channelName = `live-stream:${streamId}`;
    const channel = ably.channels.get(channelName);
    
    this.channels.set(channelName, channel);

    // Enter presence
    await channel.presence.enter({
      userId,
      username: userInfo.name,
      avatar: userInfo.avatar,
      role: userInfo.role,
      status: 'online',
    });

    const sendChatMessage = async (content: string) => {
      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'text',
        content,
        senderId: userId,
        senderName: userInfo.name,
        senderAvatar: userInfo.avatar,
        timestamp: new Date().toISOString(),
      };

      await channel.publish('chat', message);
    };

    const sendGift = async (gift: { type: string; quantity: number; message?: string }) => {
      const giftMessage = {
        id: `gift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: userId,
        senderName: userInfo.name,
        senderAvatar: userInfo.avatar,
        gift,
        timestamp: new Date().toISOString(),
      };

      await channel.publish('gift', giftMessage);
    };

    const leave = async () => {
      await channel.presence.leave();
      await channel.detach();
      this.channels.delete(channelName);
    };

    return { channel, sendChatMessage, sendGift, leave };
  }

  /**
   * Subscribe to user notifications
   */
  async subscribeToNotifications(
    userId: string,
    onNotification: (notification: {
      type: 'reading' | 'payment' | 'message' | 'stream' | 'system';
      title: string;
      content: string;
      data?: Record<string, any>;
      actionUrl?: string;
    }) => void
  ): Promise<() => Promise<void>> {
    await this.ensureConnection();

    const channelName = `user:${userId}:notifications`;
    const channel = ably.channels.get(channelName);
    
    this.channels.set(channelName, channel);

    await channel.subscribe('notification', (message) => {
      onNotification(message.data);
    });

    return async () => {
      await channel.unsubscribe();
      await channel.detach();
      this.channels.delete(channelName);
    };
  }

  /**
   * Subscribe to private messages
   */
  async subscribeToPrivateMessages(
    userId: string,
    onMessage: (message: ChatMessage) => void
  ): Promise<() => Promise<void>> {
    await this.ensureConnection();

    const channelName = `user:${userId}:messages`;
    const channel = ably.channels.get(channelName);
    
    this.channels.set(channelName, channel);

    await channel.subscribe('message', (message) => {
      onMessage(message.data);
    });

    return async () => {
      await channel.unsubscribe();
      await channel.detach();
      this.channels.delete(channelName);
    };
  }

  /**
   * Subscribe to reader status updates
   */
  async subscribeToReaderStatus(
    readerId: string,
    onStatusUpdate: (status: {
      isOnline: boolean;
      isAvailable: boolean;
      lastSeen?: string;
    }) => void
  ): Promise<() => Promise<void>> {
    await this.ensureConnection();

    const channelName = `reader:${readerId}:status`;
    const channel = ably.channels.get(channelName);
    
    this.channels.set(channelName, channel);

    await channel.subscribe('status-update', (message) => {
      onStatusUpdate(message.data);
    });

    return async () => {
      await channel.unsubscribe();
      await channel.detach();
      this.channels.delete(channelName);
    };
  }

  /**
   * Publish reader status update
   */
  async publishReaderStatus(
    readerId: string,
    status: {
      isOnline: boolean;
      isAvailable: boolean;
      lastSeen?: string;
    }
  ): Promise<void> {
    await this.ensureConnection();

    const channelName = `reader:${readerId}:status`;
    const channel = ably.channels.get(channelName);
    
    await channel.publish('status-update', status);
  }

  /**
   * Send notification to user
   */
  async sendNotification(
    userId: string,
    notification: {
      type: 'reading' | 'payment' | 'message' | 'stream' | 'system';
      title: string;
      content: string;
      data?: Record<string, any>;
      actionUrl?: string;
    }
  ): Promise<void> {
    await this.ensureConnection();

    const channelName = `user:${userId}:notifications`;
    const channel = ably.channels.get(channelName);
    
    await channel.publish('notification', notification);
  }

  /**
   * Send private message
   */
  async sendPrivateMessage(
    receiverId: string,
    message: ChatMessage
  ): Promise<void> {
    await this.ensureConnection();

    const channelName = `user:${receiverId}:messages`;
    const channel = ably.channels.get(channelName);
    
    await channel.publish('message', message);
  }

  /**
   * Get presence in a channel
   */
  async getPresence(channelName: string): Promise<Ably.Types.PresenceMessage[]> {
    await this.ensureConnection();

    const channel = ably.channels.get(channelName);
    return new Promise((resolve, reject) => {
      channel.presence.get((err, presenceMessages) => {
        if (err) {
          reject(err);
        } else {
          resolve(presenceMessages || []);
        }
      });
    });
  }

  /**
   * Subscribe to presence events in a channel
   */
  async subscribeToPresence(
    channelName: string,
    onPresenceChange: (action: 'enter' | 'leave' | 'update', member: PresenceData) => void
  ): Promise<() => Promise<void>> {
    await this.ensureConnection();

    const channel = ably.channels.get(channelName);
    this.channels.set(channelName, channel);

    const presenceListener = (presenceMessage: Ably.Types.PresenceMessage) => {
      onPresenceChange(
        presenceMessage.action as 'enter' | 'leave' | 'update',
        presenceMessage.data
      );
    };

    channel.presence.subscribe(presenceListener);

    return async () => {
      channel.presence.unsubscribe(presenceListener);
      await channel.detach();
      this.channels.delete(channelName);
    };
  }

  /**
   * Get connection state
   */
  getConnectionState(): Ably.Types.ConnectionState {
    return ably.connection.state;
  }

  /**
   * Close all channels and disconnect
   */
  async disconnect(): Promise<void> {
    // Close all channels
    for (const [name, channel] of this.channels) {
      try {
        await channel.detach();
      } catch (error) {
        console.error(`Error detaching channel ${name}:`, error);
      }
    }
    
    this.channels.clear();
    
    // Close connection
    ably.close();
    this.isConnected = false;
  }

  /**
   * Get channel history
   */
  async getChannelHistory(
    channelName: string,
    limit: number = 50
  ): Promise<Ably.Types.Message[]> {
    await this.ensureConnection();

    const channel = ably.channels.get(channelName);
    
    return new Promise((resolve, reject) => {
      channel.history({ limit }, (err, resultPage) => {
        if (err) {
          reject(err);
        } else {
          resolve(resultPage?.items || []);
        }
      });
    });
  }

  /**
   * Check if client can publish to channel
   */
  async canPublish(channelName: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const channel = ably.channels.get(channelName);
      // Try to attach to check permissions
      await channel.attach();
      return true;
    } catch (error) {
      console.error(`Cannot publish to channel ${channelName}:`, error);
      return false;
    }
  }
}

// Server-side functions for Ably token authentication (when using token auth)
export async function generateAblyToken(
  clientId: string,
  capability?: Record<string, string[]>
): Promise<string> {
  if (typeof window !== 'undefined') {
    throw new Error('Token generation should be done server-side');
  }

  try {
    const response = await fetch('/api/ably/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        capability,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate token');
    }

    const { token } = await response.json();
    return token;
  } catch (error) {
    console.error('Error generating Ably token:', error);
    throw error;
  }
}

// Utility functions
export function formatChatMessage(
  content: string,
  senderId: string,
  senderName: string,
  type: ChatMessage['type'] = 'text',
  metadata?: Record<string, any>
): ChatMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    content,
    senderId,
    senderName,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

export function isSystemMessage(message: any): message is SystemMessage {
  return message && typeof message.type === 'string' && 
         ['user_joined', 'user_left', 'session_started', 'session_ended', 'gift_sent', 'status_update'].includes(message.type);
}

export function formatSystemMessage(
  type: SystemMessage['type'],
  data: Record<string, any>
): SystemMessage {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
  };
}

// Export singleton instance
export const ablyService = new AblyService();

// Channel name utilities
export const ChannelNames = {
  readingSession: (sessionId: string) => `reading-session:${sessionId}`,
  liveStream: (streamId: string) => `live-stream:${streamId}`,
  userNotifications: (userId: string) => `user:${userId}:notifications`,
  userMessages: (userId: string) => `user:${userId}:messages`,
  readerStatus: (readerId: string) => `reader:${readerId}:status`,
  conversation: (conversationId: string) => `conversation:${conversationId}`,
  forumPost: (postId: string) => `forum-post:${postId}`,
  adminModeration: () => `admin:moderation`,
};
