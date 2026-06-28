import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { publishLiveEvent } from '@/lib/liveEvents';


type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
  source?: string;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  delivered?: boolean;
  seen?: boolean;
};

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
  // Chat
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  markMessagesSeen: (conversationId: string) => void;
  onMessageReceived: (callback: (message: Message) => void) => void;
  onTypingStart: (callback: (data: { userId: string; conversationId: string }) => void) => void;
  onTypingStop: (callback: (data: { userId: string; conversationId: string }) => void) => void;
  emitTypingStart: (conversationId: string) => void;
  emitTypingStop: (conversationId: string) => void;
  // Presence
  onPresenceUpdate: (callback: (data: { userId: string; online: boolean }) => void) => void;
  // Teleconsultation
  onMeetingReady: (callback: (data: { appointmentId: string; meetingUri: string }) => void) => void;
  onWaitingRoomCreated: (callback: (data: { waitingRoomId: string; doctorId: string; meetingUri: string }) => void) => void;
  onWaitingRoomPatientJoined: (callback: (data: { patientId: string; patientName: string }) => void) => void;
};

const SocketContext = createContext<SocketContextType | null>(null);

const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://imboni-eyelink-backend.onrender.com';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Only connect if user is logged in
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('[socket] Connected to server');
      setIsConnected(true);

      // Join a per-user room so backend `io.to(userId).emit('notification:new', ...)`
      // can reach this client.
      try {
        if (user?.id != null) {
          newSocket.emit('join', String(user.id));
        }
      } catch (e) {
        console.warn('[socket] Failed to join user room:', e);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('[socket] Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[socket] Connection error:', error.message);
      setIsConnected(false);
    });

    // Listen for new notifications
    newSocket.on('notification:new', (notification: Notification) => {
      console.log('[socket] New notification received:', notification);
      setNotifications((prev) => [notification, ...prev]);

      // Publish into the live event bus so LiveActivityFeed becomes dynamic.
      const role = user?.role;
      const audience = role === 'patient' ? 'patient' : role === 'doctor' || role === 'optometrist' ? 'doctor' : 'admin';

      const typeToLevel: Record<string, "info" | "success" | "warning" | "error"> = {
        info: "info",
        success: "success",
        warning: "warning",
        error: "error",
      };

      const level = typeToLevel[notification.type] ?? "info";

      publishLiveEvent({
        audience,
        level,
        title: notification.title,
        body: notification.body,
        dedupeKey: notification.id,
      });
    });


    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // Notification functions
  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Chat functions
  const joinConversation = useCallback((conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('join:conversation', conversationId);
    }
  }, [socket, isConnected]);

  const leaveConversation = useCallback((conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('leave:conversation', conversationId);
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (socket && isConnected) {
      socket.emit('message:send', { conversationId, content });
    }
  }, [socket, isConnected]);

  const onMessageReceived = useCallback((callback: (message: Message) => void) => {
    if (socket) {
      socket.on('message:receive', callback);
    }
    return () => {
      if (socket) {
        socket.off('message:receive', callback);
      }
    };
  }, [socket]);

  const onTypingStart = useCallback((callback: (data: { userId: string; conversationId: string }) => void) => {
    if (socket) {
      socket.on('typing:user', callback);
    }
    return () => {
      if (socket) {
        socket.off('typing:user', callback);
      }
    };
  }, [socket]);

  const onTypingStop = useCallback((callback: (data: { userId: string; conversationId: string }) => void) => {
    if (socket) {
      socket.on('typing:stopped', callback);
    }
    return () => {
      if (socket) {
        socket.off('typing:stopped', callback);
      }
    };
  }, [socket]);

  const emitTypingStart = useCallback((conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('typing:start', conversationId);
    }
  }, [socket, isConnected]);

  const emitTypingStop = useCallback((conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('typing:stop', conversationId);
    }
  }, [socket, isConnected]);

  const markMessagesSeen = useCallback((conversationId: string) => {
    if (socket && isConnected) {
      socket.emit('message:seen', conversationId);
    }
  }, [socket, isConnected]);

  const onMessageSeenUpdate = useCallback((callback: (data: { messageId: string; seenBy: string }) => void) => {
    if (socket) {
      socket.on('message:seen:update', callback);
    }
    return () => {
      if (socket) socket.off('message:seen:update', callback);
    };
  }, [socket]);

  // Teleconsultation callbacks
  const onMeetingReady = useCallback((callback: (data: { appointmentId: string; meetingUri: string }) => void) => {
    if (socket) {
      socket.on('meeting:ready', callback);
    }
    return () => {
      if (socket) socket.off('meeting:ready', callback);
    };
  }, [socket]);

  const onWaitingRoomCreated = useCallback((callback: (data: { waitingRoomId: string; doctorId: string; meetingUri: string }) => void) => {
    if (socket) {
      socket.on('waiting-room:created', callback);
    }
    return () => {
      if (socket) socket.off('waiting-room:created', callback);
    };
  }, [socket]);

  const onWaitingRoomPatientJoined = useCallback((callback: (data: { patientId: string; patientName: string }) => void) => {
    if (socket) {
      socket.on('waiting-room:patient-joined', callback);
    }
    return () => {
      if (socket) socket.off('waiting-room:patient-joined', callback);
    };
  }, [socket]);

  const onPresenceUpdate = useCallback((callback: (data: { userId: string; online: boolean }) => void) => {
    if (socket) {
      socket.on('presence:update', callback);
    }
    return () => {
      if (socket) socket.off('presence:update', callback);
    };
  }, [socket]);

  const value: SocketContextType = {
    socket,
    isConnected,
    notifications,
    addNotification,
    clearNotifications,
    joinConversation,
    leaveConversation,
    sendMessage,
    markMessagesSeen,
    onMessageReceived,
    onMessageSeenUpdate,
    onTypingStart,
    onTypingStop,
    emitTypingStart,
    emitTypingStop,
    onPresenceUpdate,
    onMeetingReady,
    onWaitingRoomCreated,
    onWaitingRoomPatientJoined,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
