/**
 * Campaign Hooks
 * React Query hooks for campaign operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { campaignService } from '../services/campaignService';
import type {
  Campaign,
  CampaignTemplate,
  CampaignStats,
  CampaignRecipient,
  CreateCampaignInput,
  UpdateCampaignInput
} from '../models/types';

/**
 * Get all campaigns
 * @param options - Query options including refetch interval
 */
export function useCampaigns(options?: { refetchInterval?: number | false; enabled?: boolean }) {
  return useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => campaignService.list(),
    staleTime: 1000 * 30, // Consider data fresh for 30 seconds
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchInterval: options?.refetchInterval !== undefined 
      ? options.refetchInterval 
      : (query) => {
          // Only poll if there are active campaigns (running or paused)
          const data = query.state.data || [];
          const hasActiveCampaigns = data.some(
            (c: Campaign) => c.status === 'running' || c.status === 'paused'
          );
          // Poll every 5s if active, otherwise every 30s
          return hasActiveCampaigns ? 5000 : 30000;
        },
    enabled: options?.enabled !== false
  });
}

/**
 * Get a single campaign
 */
export function useCampaign(id: string | null, options?: { refetchInterval?: number | false }) {
  return useQuery<Campaign>({
    queryKey: ['campaigns', id],
    queryFn: () => campaignService.get(id!),
    enabled: !!id,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchInterval: options?.refetchInterval !== undefined
      ? options.refetchInterval
      : (query) => {
          // Only poll if campaign is active
          const campaign = query.state.data;
          if (campaign && (campaign.status === 'running' || campaign.status === 'paused')) {
            return 5000; // Poll every 5s for active campaigns
          }
          return false; // Don't poll for inactive campaigns
        }
  });
}

/**
 * Create campaign mutation
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation<Campaign, Error, CreateCampaignInput>({
    mutationFn: (data) => campaignService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campanha criada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao criar campanha: ${error.message}`);
    }
  });
}

/**
 * Update campaign mutation
 */
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation<
    Campaign,
    Error,
    { id: string; data: Partial<UpdateCampaignInput> }
  >({
    mutationFn: ({ id, data }) => campaignService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.id] });
      toast.success('Campanha atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar campanha: ${error.message}`);
    }
  });
}

/**
 * Delete campaign mutation
 */
export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => campaignService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campanha deletada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao deletar campanha: ${error.message}`);
    }
  });
}

/**
 * Launch campaign mutation
 */
export function useLaunchCampaign() {
  const queryClient = useQueryClient();

  return useMutation<Campaign, Error, string>({
    mutationFn: (id) => campaignService.launch(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.id] });
      toast.success('Campanha iniciada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao iniciar campanha: ${error.message}`);
    }
  });
}

/**
 * Pause campaign mutation
 */
export function usePauseCampaign() {
  const queryClient = useQueryClient();

  return useMutation<Campaign, Error, string>({
    mutationFn: (id) => campaignService.pause(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.id] });
      toast.success('Campanha pausada!');
    },
    onError: (error) => {
      toast.error(`Erro ao pausar campanha: ${error.message}`);
    }
  });
}

/**
 * Resume campaign mutation
 */
export function useResumeCampaign() {
  const queryClient = useQueryClient();

  return useMutation<Campaign, Error, string>({
    mutationFn: (id) => campaignService.resume(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.id] });
      toast.success('Campanha retomada!');
    },
    onError: (error) => {
      toast.error(`Erro ao retomar campanha: ${error.message}`);
    }
  });
}

/**
 * Cancel campaign mutation
 */
export function useCancelCampaign() {
  const queryClient = useQueryClient();

  return useMutation<Campaign, Error, string>({
    mutationFn: (id) => campaignService.cancel(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.id] });
      toast.success('Campanha cancelada!');
    },
    onError: (error) => {
      toast.error(`Erro ao cancelar campanha: ${error.message}`);
    }
  });
}

/**
 * Get campaign stats
 */
export function useCampaignStats(id: string | null, options?: { refetchInterval?: number | false }) {
  return useQuery<CampaignStats>({
    queryKey: ['campaigns', id, 'stats'],
    queryFn: () => campaignService.getStats(id!),
    enabled: !!id,
    staleTime: 1000 * 10, // Stats are more time-sensitive
    gcTime: 1000 * 60 * 2,
    refetchInterval: options?.refetchInterval !== undefined
      ? options.refetchInterval
      : (query) => {
          // Only poll if we have a campaign and it's active
          // We need to check the campaign status from the campaign query
          return 5000; // Poll every 5s when enabled (will be disabled by parent if campaign is inactive)
        }
  });
}

/**
 * Get campaign recipients
 */
export function useCampaignRecipients(id: string | null) {
  return useQuery<CampaignRecipient[]>({
    queryKey: ['campaigns', id, 'recipients'],
    queryFn: () => campaignService.getRecipients(id!),
    enabled: !!id
  });
}

/**
 * Templates
 */
export function useTemplates() {
  return useQuery<CampaignTemplate[]>({
    queryKey: ['campaigns', 'templates'],
    queryFn: () => campaignService.listTemplates()
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation<CampaignTemplate, Error, Partial<CampaignTemplate>>({
    mutationFn: (data) => campaignService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'templates'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    }
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation<
    CampaignTemplate,
    Error,
    { id: string; data: Partial<CampaignTemplate> }
  >({
    mutationFn: ({ id, data }) => campaignService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'templates'] });
      toast.success('Template atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar template: ${error.message}`);
    }
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => campaignService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'templates'] });
      toast.success('Template deletado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao deletar template: ${error.message}`);
    }
  });
}

