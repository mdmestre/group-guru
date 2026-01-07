/**
 * WhatsApp Connections Hook
 * 
 * Manages WhatsApp connection instances via API.
 * Synchronized with backend repository: database/repositories/WhatsAppConnectionRepository.js
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { WhatsAppInstance, mapBackendToInstance, MAX_INSTANCES_PER_COMPANY } from '@/types/whatsapp';
import { toast } from 'sonner';

export function useWhatsAppConnections() {
  const { company, token } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    limit: MAX_INSTANCES_PER_COMPANY,
    remaining: MAX_INSTANCES_PER_COMPANY
  });

  // Fetch connections from API
  const fetchConnections = useCallback(async () => {
    if (!company?.id || !token) return;

    try {
      setIsLoading(true);
      const data = await apiFetch('/connections');
      
      if (data.success && Array.isArray(data.connections)) {
        const formatted = data.connections.map((conn: Record<string, unknown>) => 
          mapBackendToInstance(conn)
        );
        setInstances(formatted);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Erro ao carregar conexões');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, token]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!company?.id || !token) return;

    try {
      const data = await apiFetch('/connections/stats');
      if (data.success) {
        setStats({
          total: data.total,
          active: data.active,
          limit: data.limit,
          remaining: data.remaining
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [company?.id, token]);

  // Load data on mount and when company changes
  useEffect(() => {
    fetchConnections();
    fetchStats();
  }, [fetchConnections, fetchStats]);

  // Update instance by id (must be defined before connect)
  const updateInstanceById = useCallback((id: string, updates: Partial<WhatsAppInstance>) => {
    setInstances(prev => prev.map(inst => {
      if (inst.id === id) {
        return { ...inst, ...updates };
      }
      return inst;
    }));
  }, []);

  // Update instance status (for Socket.IO real-time updates)
  const updateInstanceStatus = useCallback((connectionId: string, updates: Partial<WhatsAppInstance>) => {
    console.log('🔧 updateInstanceStatus chamado:', { connectionId, updates });
    setInstances(prev => {
      const updated = prev.map(inst => {
        // Match by connectionId (from backend) or id
        if (inst.connectionId === connectionId || inst.id === connectionId) {
          console.log('✅ Match encontrado!', { instId: inst.id, instConnectionId: inst.connectionId, updates });
          return { ...inst, ...updates };
        }
        return inst;
      });
      console.log('📊 Instâncias após update:', updated.map(i => ({ id: i.id, connectionId: i.connectionId, status: i.status, hasQR: !!i.qrCode })));
      return updated;
    });
  }, []);

  // Create connection
  const createConnection = useCallback(async (name: string) => {
    try {
      const data = await apiFetch('/connections', {
        method: 'POST',
        body: JSON.stringify({ name })
      });

      if (data.success) {
        await fetchConnections();
        await fetchStats();
        toast.success('Conexão criada', {
          description: `${name} foi adicionada. Clique em Conectar para gerar o QR Code.`
        });
        return data.connection;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Erro ao criar conexão');
      throw error;
    }
  }, [fetchConnections, fetchStats]);

  // Estado para rastrear conexões em progresso (evita múltiplas chamadas)
  const connectingIdsRef = useRef<Set<string>>(new Set());

  // Connect (start Baileys instance) - CORRIGIDO: proteção contra múltiplas chamadas
  const connect = useCallback(async (id: string) => {
    console.log(`🔌 Connect called for id: ${id}`);
    
    // Verificar se já está conectando
    if (connectingIdsRef.current.has(id)) {
      console.log(`⚠️ Connection ${id} already in progress, skipping...`);
      return;
    }

    // Verificar se a instância já está conectando ou conectada
    const instance = instances.find(i => i.id === id);
    if (instance && (instance.status === 'connecting' || instance.status === 'waiting_qr' || instance.status === 'connected')) {
      console.log(`⚠️ Instance ${id} already ${instance.status}, skipping...`);
      return;
    }

    try {
      connectingIdsRef.current.add(id);
      console.log(`✅ Starting connection for ${id}`);
      
      const data = await apiFetch(`/connections/${id}/connect`, {
        method: 'POST'
      });

      console.log(`📡 Connect response:`, { success: data.success, hasQR: !!data.qrCode, status: data.status });

      if (data.success) {
        // NÃO atualizar localmente - deixar o socket fazer isso
        // Isso evita conflitos e loops
        // updateInstanceById(id, {
        //   status: data.qrCode ? 'waiting_qr' : 'connecting',
        //   qrCode: data.qrCode || undefined
        // });
        
        toast.info('Iniciando conexão...', {
          description: data.qrCode ? 'QR Code gerado!' : 'Aguardando QR Code...'
        });
        return data;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error connecting ${id}:`, message);
      toast.error(message || 'Erro ao conectar');
      throw error;
    } finally {
      // Remover após um delay para permitir que o socket atualize o status
      setTimeout(() => {
        connectingIdsRef.current.delete(id);
        console.log(`🧹 Removed ${id} from connecting set`);
      }, 3000);
    }
  }, [instances]);

  // Disconnect
  const disconnect = useCallback(async (id: string) => {
    try {
      const data = await apiFetch(`/connections/${id}/disconnect`, {
        method: 'POST'
      });

      if (data.success) {
        await fetchConnections();
        toast.info('WhatsApp desconectado');
        return data;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Erro ao desconectar');
      throw error;
    }
  }, [fetchConnections]);

  // Delete connection
  const deleteConnection = useCallback(async (id: string) => {
    const instance = instances.find(i => i.id === id);
    
    try {
      const data = await apiFetch(`/connections/${id}`, {
        method: 'DELETE'
      });

      if (data.success) {
        await fetchConnections();
        await fetchStats();
        toast.success('Instância removida', {
          description: `${instance?.name} foi excluída.`
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Erro ao excluir');
      throw error;
    }
  }, [instances, fetchConnections, fetchStats]);

  // Rename connection
  const renameConnection = useCallback(async (id: string, name: string) => {
    try {
      const data = await apiFetch(`/connections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name })
      });

      if (data.success) {
        await fetchConnections();
        toast.success('Nome atualizado');
        return data.connection;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Erro ao renomear');
      throw error;
    }
  }, [fetchConnections]);

  // Refresh connection (fetch QR code if waiting)
  const refreshConnection = useCallback(async (id: string) => {
    try {
      await fetchConnections();
      toast.success('Status atualizado');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Erro ao atualizar');
    }
  }, [fetchConnections]);

  // Get QR code
  const getQRCode = useCallback(async (id: string) => {
    try {
      const data = await apiFetch(`/connections/${id}/qr`);
      if (data.success && data.qrCode) {
        return data.qrCode;
      }
      return null;
    } catch (error) {
      console.error('Error fetching QR code:', error);
      return null;
    }
  }, []);

  return {
    instances,
    stats,
    isLoading,
    createConnection,
    connect,
    disconnect,
    deleteConnection,
    renameConnection,
    refreshConnection,
    getQRCode,
    refetch: fetchConnections,
    updateInstanceStatus,
    updateInstanceById,
    setInstances
  };
}

