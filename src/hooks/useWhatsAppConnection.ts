/**
 * Hook para escutar status de conexão WhatsApp em tempo real via Socket.IO
 * Retorna o status da primeira conexão ativa (conectada ou aguardando QR)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/contexts/AuthContext';

export interface WhatsAppConnectionStatus {
  status: 'connected' | 'connecting' | 'waiting_qr' | 'disconnected';
  qrCode?: string;
  phoneNumber?: string;
  connectionId?: string;
}

export function useWhatsAppConnection(): WhatsAppConnectionStatus {
  const { company } = useAuth();
  const [status, setStatus] = useState<WhatsAppConnectionStatus>({
    status: 'disconnected'
  });

  const companyId = useMemo(() => company?.id, [company?.id]);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const socket = getSocket();
    if (!companyId) {
      setStatus({ status: 'disconnected' });
      return;
    }

    console.log('🔌 useWhatsAppConnection: Configurando listeners para company:', companyId);

    // Handler de status
    const onStatus = (data: unknown) => {
      const d = data as Record<string, unknown>;
      const connectionStatus = d['status'] as string | undefined;
      const qrCode = d['qrCode'] as string | undefined;
      const connectionId = d['connectionId'] as string | undefined;

      if (!connectionId) {
        console.log('⚠️ Status event sem connectionId, ignorando');
        return;
      }

      console.log('📡 Status event recebido:', { connectionId, status: connectionStatus, hasQR: !!qrCode });

      // Atualiza o status baseado nos eventos
      if (connectionStatus === 'connecting' || connectionStatus === 'waiting_qr') {
        setStatus({
          status: connectionStatus === 'waiting_qr' ? 'waiting_qr' : 'connecting',
          qrCode: qrCode || statusRef.current.qrCode,
          connectionId
        });
      } else if (connectionStatus === 'connected') {
        setStatus({
          status: 'connected',
          connectionId,
          phoneNumber: statusRef.current.phoneNumber // Mantém phoneNumber se já existir
        });
      } else if (connectionStatus === 'disconnected') {
        setStatus({
          status: 'disconnected'
        });
      }
    };

    // Handler de QR
    const onQR = (qr: string, connectionIdParam?: string) => {
      console.log('📱 QR event recebido:', { connectionIdParam, hasQR: !!qr });
      
      if (connectionIdParam) {
        setStatus(prev => ({
          ...prev,
          status: 'waiting_qr',
          qrCode: qr,
          connectionId: connectionIdParam
        }));
      } else {
        // Se não tem connectionId, atualiza se já está aguardando QR
        setStatus(prev => {
          if (prev.status === 'waiting_qr' || prev.status === 'connecting') {
            return {
              ...prev,
              qrCode: qr
            };
          }
          return prev;
        });
      }
    };

    // Handler de connected
    const onConnected = (connectionIdParam?: string) => {
      console.log('✅ Connected event recebido:', { connectionIdParam });
      
      setStatus(prev => ({
        ...prev,
        status: 'connected',
        qrCode: undefined, // Remove QR quando conecta
        connectionId: connectionIdParam || prev.connectionId
      }));
    };

    // Subscribe to company room
    socket.emit('subscribe-company-connections', companyId);

    // Listen to events
    socket.on('status', onStatus);
    socket.on('qr', onQR);
    socket.on('connected', onConnected);

    // Request status on connect
    const onSocketConnect = () => {
      console.log('✅ Socket conectado no useWhatsAppConnection');
      socket.emit('subscribe-company-connections', companyId);
    };
    socket.on('connect', onSocketConnect);

    // Cleanup
    return () => {
      console.log('🧹 useWhatsAppConnection: Limpando listeners');
      socket.off('status', onStatus);
      socket.off('qr', onQR);
      socket.off('connected', onConnected);
      socket.off('connect', onSocketConnect);
    };
  }, [companyId]);

  return status;
}

