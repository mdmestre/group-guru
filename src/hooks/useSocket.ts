import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

interface SocketStatus {
  status: 'connected' | 'connecting' | 'disconnected';
  qrCode?: string;
  cycleStatus?: {
    isRunning: boolean;
    currentCycle: number;
    processedInCycle: number;
    nextCycleAt?: string;
  };
  numbers?: unknown[];
  groups?: unknown[];
  selectedGroup?: string;
}

interface NewMessageEvent {
  clientId?: string;
  jid: string;
  message: {
    side: 'in' | 'out';
    text: string;
    timestamp: string;
  };
  meta?: {
    status: 'bot' | 'human';
  };
}

interface HandoverEvent {
  jid: string;
  status: 'human' | 'bot';
}

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<SocketStatus>({
    status: 'disconnected'
  });
  const [isConnected, setIsConnected] = useState(false);
  const [newMessages, setNewMessages] = useState<NewMessageEvent[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const clientId = localStorage.getItem('clientId');

    if (!token) return;

    // Create socket connection with authentication
    const socketInstance = io(SOCKET_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    setSocket(socketInstance);

    // Connection events
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      
      // Subscribe to client-specific events
      if (clientId) {
        socketInstance.emit('subscribe', clientId);
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // WhatsApp status updates
    socketInstance.on('status', (data: SocketStatus) => {
      console.log('Status update:', data);
      setStatus(data);
    });

    // New message events
    socketInstance.on('new-message', (data: NewMessageEvent) => {
      console.log('New message:', data);
      setNewMessages(prev => [...prev, data]);
    });

    // Handover events (bot to human)
    socketInstance.on('handover', (data: HandoverEvent) => {
      console.log('Handover:', data);
      // You can handle this in your chat components
    });

    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Connect WhatsApp
  const connectWhatsApp = useCallback(() => {
    if (socket) {
      socket.emit('connect-whatsapp');
    }
  }, [socket]);

  // Subscribe to a specific client (for multi-tenant)
  const subscribeToClient = useCallback((clientId: string) => {
    if (socket) {
      socket.emit('subscribe', clientId);
    }
  }, [socket]);

  // Clear new messages
  const clearNewMessages = useCallback(() => {
    setNewMessages([]);
  }, []);

  // Get new messages for a specific contact
  const getMessagesForContact = useCallback((jid: string) => {
    return newMessages.filter(msg => msg.jid === jid);
  }, [newMessages]);

  return {
    socket,
    isConnected,
    status,
    newMessages,
    connectWhatsApp,
    subscribeToClient,
    clearNewMessages,
    getMessagesForContact
  };
};

export default useSocket;
