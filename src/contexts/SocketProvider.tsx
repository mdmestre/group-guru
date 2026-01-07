/**
 * Provider para Socket.IO e Real-Time Updates
 * Sincroniza dados em tempo real e invalida queries do React Query
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: {
        token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    // 📨 Eventos de Mensagens
    newSocket.on('message:new', (data: any) => {
      console.log('[Socket] New message:', data);
      // Invalidate conversations
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // Invalidate specific conversation messages
      if (data.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ['messages', data.conversationId]
        });
      }
      // Invalidate contact stats
      queryClient.invalidateQueries({ queryKey: ['contactStats'] });
    });

    newSocket.on('message:delivered', (data: any) => {
      console.log('[Socket] Message delivered:', data);
      queryClient.invalidateQueries({ queryKey: ['messages', data.conversationId] });
    });

    newSocket.on('message:read', (data: any) => {
      console.log('[Socket] Message read:', data);
      queryClient.invalidateQueries({ queryKey: ['messages', data.conversationId] });
    });

    // 📞 Eventos de Contatos
    newSocket.on('contact:new', (data: any) => {
      console.log('[Socket] New contact:', data);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contactStats'] });
    });

    newSocket.on('contact:updated', (data: any) => {
      console.log('[Socket] Contact updated:', data);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    // 🚀 Eventos de Campanhas
    newSocket.on('campaign:created', (data: any) => {
      console.log('[Socket] Campaign created:', data);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    });

    newSocket.on('campaign:status_changed', (data: any) => {
      console.log('[Socket] Campaign status changed:', data);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.campaignId, 'stats'] });
    });

    newSocket.on('campaign:progress', (data: any) => {
      console.log('[Socket] Campaign progress:', data);
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.campaignId, 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.campaignId, 'recipients'] });
    });

    // 🔌 Eventos de Conexão WhatsApp
    newSocket.on('connection:status_changed', (data: any) => {
      console.log('[Socket] Connection status changed:', data);
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['connections', data.connectionId] });
      queryClient.invalidateQueries({ queryKey: ['connectionStats'] });
    });

    newSocket.on('connection:qr_code', (data: any) => {
      console.log('[Socket] QR Code received:', data);
      queryClient.invalidateQueries({ queryKey: ['connections', data.connectionId] });
    });

    // 📊 Eventos de Dashboard
    newSocket.on('dashboard:metrics_updated', (data: any) => {
      console.log('[Socket] Dashboard metrics updated:', data);
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
    });

    // 🔄 Eventos de Pipeline (CRM)
    newSocket.on('pipeline:updated', (data: any) => {
      console.log('[Socket] Pipeline updated:', data);
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      if (data.pipelineId) {
        queryClient.invalidateQueries({ queryKey: ['pipelines', data.pipelineId] });
        queryClient.invalidateQueries({ queryKey: ['pipelines', data.pipelineId, 'stages'] });
      }
    });

    newSocket.on('pipeline:stage_updated', (data: any) => {
      console.log('[Socket] Pipeline stage updated:', data);
      if (data.pipelineId) {
        queryClient.invalidateQueries({ queryKey: ['pipelines', data.pipelineId, 'stages'] });
      }
    });

    newSocket.on('pipeline:contact_moved', (data: any) => {
      console.log('[Socket] Contact moved in pipeline:', data);
      if (data.pipelineId) {
        queryClient.invalidateQueries({ queryKey: ['pipelines', data.pipelineId, 'stages'] });
      }
    });

    // 🎯 Eventos de Lead Scoring
    newSocket.on('lead-scoring:score_updated', (data: any) => {
      console.log('[Socket] Lead score updated:', data);
      queryClient.invalidateQueries({ queryKey: ['lead-scoring'] });
      if (data.contactId) {
        queryClient.invalidateQueries({ queryKey: ['lead-scoring', 'scores', data.contactId] });
      }
    });

    newSocket.on('lead-scoring:rule_updated', (data: any) => {
      console.log('[Socket] Scoring rule updated:', data);
      queryClient.invalidateQueries({ queryKey: ['lead-scoring', 'rules'] });
    });

    // 📋 Eventos de Segments
    newSocket.on('segment:updated', (data: any) => {
      console.log('[Socket] Segment updated:', data);
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      if (data.segmentId) {
        queryClient.invalidateQueries({ queryKey: ['segments', 'detail', data.segmentId] });
      }
    });

    newSocket.on('segment:members_refreshed', (data: any) => {
      console.log('[Socket] Segment members refreshed:', data);
      if (data.segmentId) {
        queryClient.invalidateQueries({ queryKey: ['segments', 'detail', data.segmentId, 'members'] });
      }
    });

    // 📝 Eventos de Custom Fields
    newSocket.on('custom-field:updated', (data: any) => {
      console.log('[Socket] Custom field updated:', data);
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
    });

    // ❌ Tratamento de Erros
    newSocket.on('error', (error: any) => {
      console.error('[Socket] Error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}
