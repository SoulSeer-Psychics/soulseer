import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  ClientRole,
  UID
} from 'agora-rtc-sdk-ng';

if (!process.env.NEXT_PUBLIC_AGORA_APP_ID) {
  throw new Error('NEXT_PUBLIC_AGORA_APP_ID is not set');
}

export const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;

// Agora client configuration
AgoraRTC.setLogLevel(process.env.NODE_ENV === 'development' ? 1 : 4);

export interface AgoraUser {
  uid: UID;
  videoTrack?: IRemoteVideoTrack;
  audioTrack?: IRemoteAudioTrack;
}

export interface LocalTracks {
  videoTrack?: ICameraVideoTrack;
  audioTrack?: IMicrophoneAudioTrack;
}

export class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private localTracks: LocalTracks = {};
  private remoteUsers: Map<UID, AgoraUser> = new Map();
  private isJoined = false;

  constructor() {
    this.client = AgoraRTC.createClient({
      mode: 'rtc',
      codec: 'vp8'
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.client) return;

    this.client.on('user-published', this.handleUserPublished.bind(this));
    this.client.on('user-unpublished', this.handleUserUnpublished.bind(this));
    this.client.on('user-joined', this.handleUserJoined.bind(this));
    this.client.on('user-left', this.handleUserLeft.bind(this));
    this.client.on('connection-state-change', this.handleConnectionStateChange.bind(this));
  }

  private async handleUserPublished(user: any, mediaType: 'video' | 'audio') {
    await this.client!.subscribe(user, mediaType);
    
    const remoteUser = this.remoteUsers.get(user.uid) || { uid: user.uid };
    
    if (mediaType === 'video') {
      remoteUser.videoTrack = user.videoTrack;
    } else if (mediaType === 'audio') {
      remoteUser.audioTrack = user.audioTrack;
    }
    
    this.remoteUsers.set(user.uid, remoteUser);
    
    // Trigger callback for UI updates
    if (this.onUserPublished) {
      this.onUserPublished(user.uid, mediaType);
    }
  }

  private handleUserUnpublished(user: any, mediaType: 'video' | 'audio') {
    const remoteUser = this.remoteUsers.get(user.uid);
    if (!remoteUser) return;

    if (mediaType === 'video') {
      remoteUser.videoTrack = undefined;
    } else if (mediaType === 'audio') {
      remoteUser.audioTrack = undefined;
    }

    if (this.onUserUnpublished) {
      this.onUserUnpublished(user.uid, mediaType);
    }
  }

  private handleUserJoined(user: any) {
    this.remoteUsers.set(user.uid, { uid: user.uid });
    
    if (this.onUserJoined) {
      this.onUserJoined(user.uid);
    }
  }

  private handleUserLeft(user: any) {
    this.remoteUsers.delete(user.uid);
    
    if (this.onUserLeft) {
      this.onUserLeft(user.uid);
    }
  }

  private handleConnectionStateChange(curState: string, revState: string) {
    console.log(`Agora connection state changed from ${revState} to ${curState}`);
    
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(curState, revState);
    }
  }

  // Event callbacks - to be set by the consuming component
  public onUserPublished?: (uid: UID, mediaType: 'video' | 'audio') => void;
  public onUserUnpublished?: (uid: UID, mediaType: 'video' | 'audio') => void;
  public onUserJoined?: (uid: UID) => void;
  public onUserLeft?: (uid: UID) => void;
  public onConnectionStateChange?: (curState: string, revState: string) => void;

  /**
   * Join a channel
   */
  async joinChannel(
    token: string,
    channelName: string,
    uid: UID,
    role: ClientRole = 'host'
  ): Promise<void> {
    if (!this.client || this.isJoined) {
      throw new Error('Client not initialized or already joined');
    }

    try {
      this.client.setClientRole(role);
      await this.client.join(AGORA_APP_ID, channelName, token, uid);
      this.isJoined = true;
      console.log('Successfully joined Agora channel:', channelName);
    } catch (error) {
      console.error('Error joining Agora channel:', error);
      throw error;
    }
  }

  /**
   * Leave the channel
   */
  async leaveChannel(): Promise<void> {
    if (!this.client || !this.isJoined) {
      return;
    }

    try {
      // Stop and close local tracks
      await this.stopLocalTracks();
      
      // Leave the channel
      await this.client.leave();
      this.isJoined = false;
      this.remoteUsers.clear();
      
      console.log('Successfully left Agora channel');
    } catch (error) {
      console.error('Error leaving Agora channel:', error);
      throw error;
    }
  }

  /**
   * Create and publish local video track
   */
  async enableVideo(): Promise<ICameraVideoTrack> {
    if (this.localTracks.videoTrack) {
      return this.localTracks.videoTrack;
    }

    try {
      this.localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack({
        optimizationMode: 'detail',
        encoderConfig: {
          width: 640,
          height: 480,
          frameRate: 15,
          bitrateMin: 600,
          bitrateMax: 1000,
        },
      });

      if (this.client && this.isJoined) {
        await this.client.publish(this.localTracks.videoTrack);
      }

      return this.localTracks.videoTrack;
    } catch (error) {
      console.error('Error enabling video:', error);
      throw error;
    }
  }

  /**
   * Disable and unpublish local video track
   */
  async disableVideo(): Promise<void> {
    if (!this.localTracks.videoTrack) return;

    try {
      if (this.client && this.isJoined) {
        await this.client.unpublish(this.localTracks.videoTrack);
      }
      
      this.localTracks.videoTrack.stop();
      this.localTracks.videoTrack.close();
      this.localTracks.videoTrack = undefined;
    } catch (error) {
      console.error('Error disabling video:', error);
      throw error;
    }
  }

  /**
   * Create and publish local audio track
   */
  async enableAudio(): Promise<IMicrophoneAudioTrack> {
    if (this.localTracks.audioTrack) {
      return this.localTracks.audioTrack;
    }

    try {
      this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
      });

      if (this.client && this.isJoined) {
        await this.client.publish(this.localTracks.audioTrack);
      }

      return this.localTracks.audioTrack;
    } catch (error) {
      console.error('Error enabling audio:', error);
      throw error;
    }
  }

  /**
   * Disable and unpublish local audio track
   */
  async disableAudio(): Promise<void> {
    if (!this.localTracks.audioTrack) return;

    try {
      if (this.client && this.isJoined) {
        await this.client.unpublish(this.localTracks.audioTrack);
      }
      
      this.localTracks.audioTrack.stop();
      this.localTracks.audioTrack.close();
      this.localTracks.audioTrack = undefined;
    } catch (error) {
      console.error('Error disabling audio:', error);
      throw error;
    }
  }

  /**
   * Mute/unmute local audio
   */
  async muteAudio(mute: boolean): Promise<void> {
    if (!this.localTracks.audioTrack) return;
    
    await this.localTracks.audioTrack.setMuted(mute);
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    try {
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: {
          width: 1920,
          height: 1080,
          frameRate: 5,
          bitrateMin: 1000,
          bitrateMax: 3000,
        },
      });

      // Replace video track with screen share
      if (this.localTracks.videoTrack && this.client && this.isJoined) {
        await this.client.unpublish(this.localTracks.videoTrack);
        this.localTracks.videoTrack.stop();
        this.localTracks.videoTrack.close();
      }

      this.localTracks.videoTrack = screenTrack as ICameraVideoTrack;

      if (this.client && this.isJoined) {
        await this.client.publish(screenTrack);
      }
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing and resume camera
   */
  async stopScreenShare(): Promise<void> {
    if (!this.localTracks.videoTrack) return;

    try {
      if (this.client && this.isJoined) {
        await this.client.unpublish(this.localTracks.videoTrack);
      }
      
      this.localTracks.videoTrack.stop();
      this.localTracks.videoTrack.close();
      this.localTracks.videoTrack = undefined;

      // Resume camera
      await this.enableVideo();
    } catch (error) {
      console.error('Error stopping screen share:', error);
      throw error;
    }
  }

  /**
   * Play remote user's video track in a container
   */
  playVideoTrack(uid: UID, container: HTMLElement): void {
    const user = this.remoteUsers.get(uid);
    if (user?.videoTrack) {
      user.videoTrack.play(container);
    }
  }

  /**
   * Play local video track in a container
   */
  playLocalVideo(container: HTMLElement): void {
    if (this.localTracks.videoTrack) {
      this.localTracks.videoTrack.play(container);
    }
  }

  /**
   * Get connection stats
   */
  async getStats(): Promise<any> {
    if (!this.client || !this.isJoined) return null;
    
    return await this.client.getStats();
  }

  /**
   * Get remote user stats
   */
  async getRemoteStats(uid: UID): Promise<any> {
    if (!this.client || !this.isJoined) return null;
    
    return await this.client.getRemoteStats(uid);
  }

  /**
   * Get local tracks
   */
  getLocalTracks(): LocalTracks {
    return this.localTracks;
  }

  /**
   * Get remote users
   */
  getRemoteUsers(): Map<UID, AgoraUser> {
    return this.remoteUsers;
  }

  /**
   * Check if joined to channel
   */
  isJoinedToChannel(): boolean {
    return this.isJoined;
  }

  /**
   * Stop all local tracks
   */
  private async stopLocalTracks(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.localTracks.videoTrack) {
      promises.push(this.disableVideo());
    }

    if (this.localTracks.audioTrack) {
      promises.push(this.disableAudio());
    }

    await Promise.all(promises);
  }

  /**
   * Dispose the service
   */
  async dispose(): Promise<void> {
    await this.leaveChannel();
    this.client = null;
  }
}

// Server-side token generation (when AGORA_APP_CERTIFICATE is available)
export async function generateAgoraToken(
  channelName: string,
  uid: string,
  role: 'publisher' | 'subscriber' = 'publisher',
  expirationTime: number = 3600 // 1 hour
): Promise<string> {
  // In a real application, this should be done server-side
  // For now, return a placeholder token
  // You would use the agora-access-token library here
  
  if (typeof window !== 'undefined') {
    throw new Error('Token generation should be done server-side');
  }

  try {
    const response = await fetch('/api/agora/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelName,
        uid,
        role,
        expirationTime,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate token');
    }

    const { token } = await response.json();
    return token;
  } catch (error) {
    console.error('Error generating Agora token:', error);
    throw error;
  }
}

// Utility functions for Agora integration
export function getDevicePermissions(): Promise<{ audio: boolean; video: boolean }> {
  return new Promise(async (resolve) => {
    try {
      const audioPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      const videoPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });

      resolve({
        audio: audioPermission.state === 'granted',
        video: videoPermission.state === 'granted',
      });
    } catch (error) {
      // Fallback: try to access devices directly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach(track => track.stop());
        resolve({ audio: true, video: true });
      } catch {
        resolve({ audio: false, video: false });
      }
    }
  });
}

export async function getAvailableDevices(): Promise<{
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return {
      audioInputs: devices.filter(device => device.kind === 'audioinput'),
      videoInputs: devices.filter(device => device.kind === 'videoinput'),
      audioOutputs: devices.filter(device => device.kind === 'audiooutput'),
    };
  } catch (error) {
    console.error('Error getting available devices:', error);
    return { audioInputs: [], videoInputs: [], audioOutputs: [] };
  }
}

export function checkBrowserSupport(): {
  supported: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!navigator.mediaDevices) {
    issues.push('MediaDevices API not supported');
  }

  if (!navigator.mediaDevices.getUserMedia) {
    issues.push('getUserMedia not supported');
  }

  if (!window.RTCPeerConnection) {
    issues.push('WebRTC not supported');
  }

  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    issues.push('HTTPS required for media access');
  }

  return {
    supported: issues.length === 0,
    issues,
  };
}

// Export singleton instance
export const agoraService = new AgoraService();
