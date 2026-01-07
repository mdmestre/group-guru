/**
 * Hook para Campanhas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/services/apiClient';
import { Campaign, CampaignRecipient, CampaignStats, CampaignListItem } from '@/types/campaign';

const CAMPAIGNS_QUERY_KEY = ['campaigns'];

export const useCampaigns = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: CAMPAIGNS_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.get<{ campaigns: CampaignListItem[] }>('/campaigns');
      return response.campaigns;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,
    ...options
  });
};

export const useCampaign = (campaignId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...CAMPAIGNS_QUERY_KEY, campaignId],
    queryFn: async () => {
      const response = await ApiClient.get<{ campaign: Campaign }>(
        `/campaigns/${campaignId}`
      );
      return response.campaign;
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    enabled: !!campaignId && options?.enabled !== false
  });
};

export const useCampaignStats = (campaignId: string) => {
  return useQuery({
    queryKey: [...CAMPAIGNS_QUERY_KEY, campaignId, 'stats'],
    queryFn: async () => {
      const response = await ApiClient.get<{ stats: CampaignStats }>(
        `/campaigns/${campaignId}/stats`
      );
      return response.stats;
    },
    staleTime: 1000 * 30, // 30 seconds (stats atualizam mais frequentemente)
    gcTime: 1000 * 60 * 5,
    enabled: !!campaignId
  });
};

export const useCampaignRecipients = (campaignId: string, options?: { limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: [...CAMPAIGNS_QUERY_KEY, campaignId, 'recipients', options?.limit, options?.offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(options?.limit || 100),
        offset: String(options?.offset || 0)
      });
      const response = await ApiClient.get<{ recipients: CampaignRecipient[]; count: number }>(
        `/campaigns/${campaignId}/recipients?${params}`
      );
      return response;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    enabled: !!campaignId
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignData: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await ApiClient.post<{ campaign: Campaign }>(
        '/campaigns',
        campaignData
      );
      return response.campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
    }
  });
};

export const useLaunchCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await ApiClient.post<{ campaign: Campaign }>(
        `/campaigns/${campaignId}/launch`
      );
      return response.campaign;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: [...CAMPAIGNS_QUERY_KEY, campaignId] });
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
    }
  });
};

export const usePauseCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await ApiClient.post<{ campaign: Campaign }>(
        `/campaigns/${campaignId}/pause`
      );
      return response.campaign;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: [...CAMPAIGNS_QUERY_KEY, campaignId] });
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
    }
  });
};

export const useResumeCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await ApiClient.post<{ campaign: Campaign }>(
        `/campaigns/${campaignId}/resume`
      );
      return response.campaign;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: [...CAMPAIGNS_QUERY_KEY, campaignId] });
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
    }
  });
};

export const useCancelCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await ApiClient.post<{ campaign: Campaign }>(
        `/campaigns/${campaignId}/cancel`
      );
      return response.campaign;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: [...CAMPAIGNS_QUERY_KEY, campaignId] });
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
    }
  });
};

/**
 * Hook para invalidar campanhas em tempo real
 */
export const useCampaignsRealtime = () => {
  const queryClient = useQueryClient();

  const invalidateCampaigns = () => {
    queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
  };

  const invalidateCampaign = (campaignId: string) => {
    queryClient.invalidateQueries({ queryKey: [...CAMPAIGNS_QUERY_KEY, campaignId] });
  };

  const invalidateCampaignStats = (campaignId: string) => {
    queryClient.invalidateQueries({ queryKey: [...CAMPAIGNS_QUERY_KEY, campaignId, 'stats'] });
  };

  return {
    invalidateCampaigns,
    invalidateCampaign,
    invalidateCampaignStats
  };
};
