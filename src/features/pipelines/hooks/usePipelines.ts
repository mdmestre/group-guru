import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Pipeline, PipelineStage, PipelineHistory } from '../models/types';

// Query Keys
export const pipelineKeys = {
  all: ['pipelines'] as const,
  lists: () => [...pipelineKeys.all, 'list'] as const,
  list: (filters?: any) => [...pipelineKeys.lists(), { filters }] as const,
  details: () => [...pipelineKeys.all, 'detail'] as const,
  detail: (id: string) => [...pipelineKeys.details(), id] as const,
  stages: (id: string) => [...pipelineKeys.detail(id), 'stages'] as const,
  stats: (id: string) => [...pipelineKeys.detail(id), 'stats'] as const,
  history: (id: string) => [...pipelineKeys.detail(id), 'history'] as const,
};

// Types
interface GetPipelinesParams {
  companyId?: string;
  limit?: number;
  offset?: number;
}

interface CreatePipelineData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface UpdatePipelineData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface CreateStageData {
  name: string;
  position: number;
  conversionProbability?: number;
}

interface MoveContactData {
  contactId: string;
  stageId: string;
  notes?: string;
}

// Hooks
export const usePipelines = (params?: GetPipelinesParams) => {
  return useQuery({
    queryKey: pipelineKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get('/api/pipelines', { params });
      return data as Pipeline[];
    },
  });
};

export const usePipeline = (id: string) => {
  return useQuery({
    queryKey: pipelineKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/api/pipelines/${id}`);
      return data as Pipeline;
    },
    enabled: !!id,
  });
};

export const usePipelineStages = (pipelineId: string) => {
  return useQuery({
    queryKey: pipelineKeys.stages(pipelineId),
    queryFn: async () => {
      const { data } = await api.get(`/api/pipelines/${pipelineId}/stages`);
      const stages = data as PipelineStage[];
      
      // Try to fetch contacts for pipeline to populate contactIds in stages
      // This is optional - if the endpoint doesn't exist, stages will work without contactIds
      try {
        const contactsResponse = await api.get(`/api/pipelines/${pipelineId}/contacts`);
        const contacts = contactsResponse.data as Array<{ id: string; stageId?: string; pipelineStageId?: string }>;
        
        // Group contacts by stage (support both stageId and pipelineStageId)
        const contactsByStage = contacts.reduce((acc, contact) => {
          const stageId = contact.stageId || contact.pipelineStageId;
          if (stageId) {
            if (!acc[stageId]) {
              acc[stageId] = [];
            }
            acc[stageId].push(contact.id);
          }
          return acc;
        }, {} as Record<string, string[]>);
        
        // Add contactIds to each stage
        return stages.map(stage => ({
          ...stage,
          contactIds: contactsByStage[stage.id] || [],
        }));
      } catch (error) {
        // If endpoint doesn't exist or fails, return stages without contactIds
        // This is fine - contacts can be loaded separately
        return stages.map(stage => ({
          ...stage,
          contactIds: [],
        }));
      }
    },
    enabled: !!pipelineId,
  });
};

export const usePipelineStats = (stageId: string) => {
  return useQuery({
    queryKey: pipelineKeys.stats(stageId),
    queryFn: async () => {
      const { data } = await api.get(`/api/pipelines/stages/${stageId}/stats`);
      return data as {
        totalContacts: number;
        conversionRate: number;
        averageValue?: number;
      };
    },
    enabled: !!stageId,
  });
};

export const usePipelineContacts = (pipelineId: string) => {
  return useQuery({
    queryKey: [...pipelineKeys.detail(pipelineId), 'contacts'],
    queryFn: async () => {
      const { data } = await api.get(`/api/pipelines/${pipelineId}/contacts`);
      return data as Array<{ id: string; stageId: string; name: string; email?: string; phone?: string }>;
    },
    enabled: !!pipelineId,
  });
};

export const usePipelineHistory = (contactId: string) => {
  return useQuery({
    queryKey: pipelineKeys.history(contactId),
    queryFn: async () => {
      const { data } = await api.get(`/api/pipelines/contacts/${contactId}/history`);
      return data as PipelineHistory[];
    },
    enabled: !!contactId,
  });
};

// Mutations
export const useCreatePipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePipelineData) => {
      const response = await api.post('/api/pipelines', data);
      return response.data as Pipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
    },
  });
};

export const useUpdatePipeline = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePipelineData) => {
      const response = await api.put(`/api/pipelines/${id}`, data);
      return response.data as Pipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
    },
  });
};

export const useDeletePipeline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/pipelines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
    },
  });
};

export const useCreateStage = (pipelineId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStageData) => {
      const response = await api.post(`/api/pipelines/${pipelineId}/stages`, data);
      return response.data as PipelineStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.stages(pipelineId) });
    },
  });
};

export const useMoveContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MoveContactData) => {
      const response = await api.post('/api/pipelines/contacts/move', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.history(variables.contactId) });
    },
  });
};

export const useUpdateStage = (stageId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<PipelineStage>) => {
      const response = await api.put(`/api/pipelines/stages/${stageId}`, data);
      return response.data as PipelineStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
    },
  });
};
