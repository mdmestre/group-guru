/**
 * Hook para Conexões WhatsApp
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/services/apiClient';
import { WhatsAppConnection, ConnectionStats } from '@/types/connection';

const CONNECTIONS_QUERY_KEY = ['connections'];

export const useConnections = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.get<{ connections: WhatsAppConnection[] }>(
        '/connections'
      );
      return response.connections;
    },
    staleTime: 1000 * 30, // 30 seconds (conexões precisam atualizar frequentemente)
    gcTime: 1000 * 60 * 5,
    ...options
  });
};

export const useConnection = (connectionId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...CONNECTIONS_QUERY_KEY, connectionId],
    queryFn: async () => {
      const response = await ApiClient.get<{ connection: WhatsAppConnection }>(
        `/connections/${connectionId}`
      );
      return response.connection;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    enabled: !!connectionId && options?.enabled !== false
  });
};

export const useConnectionStats = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['connectionStats'],
    queryFn: async () => {
      const response = await ApiClient.get<ConnectionStats>('/connections/stats');
      return response;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    ...options
  });
};

export const useCreateConnection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await ApiClient.post<{ connection: WhatsAppConnection }>(
        '/connections',
        data
      );
      return response.connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
    }
  });
};

export const useConnectWhatsApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await ApiClient.post<{ connection: WhatsAppConnection }>(
        `/connections/${connectionId}/connect`
      );
      return response.connection;
    },
    onSuccess: (_, connectionId) => {
      queryClient.invalidateQueries({ queryKey: [...CONNECTIONS_QUERY_KEY, connectionId] });
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
    }
  });
};

export const useDisconnectWhatsApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await ApiClient.post<{ connection: WhatsAppConnection }>(
        `/connections/${connectionId}/disconnect`
      );
      return response.connection;
    },
    onSuccess: (_, connectionId) => {
      queryClient.invalidateQueries({ queryKey: [...CONNECTIONS_QUERY_KEY, connectionId] });
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
    }
  });
};

/**
 * Hook para invalidar conexões em tempo real
 */
export const useConnectionsRealtime = () => {
  const queryClient = useQueryClient();

  const invalidateConnections = () => {
    queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
  };

  const invalidateConnection = (connectionId: string) => {
    queryClient.invalidateQueries({ queryKey: [...CONNECTIONS_QUERY_KEY, connectionId] });
  };

  const invalidateStats = () => {
    queryClient.invalidateQueries({ queryKey: ['connectionStats'] });
  };

  return {
    invalidateConnections,
    invalidateConnection,
    invalidateStats
  };
};
