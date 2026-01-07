import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { LeadScore, LeadScoringRule } from '../models/types';

// Query Keys
export const leadScoringKeys = {
  all: ['lead-scoring'] as const,
  scores: () => [...leadScoringKeys.all, 'scores'] as const,
  score: (contactId: string) => [...leadScoringKeys.scores(), contactId] as const,
  rules: () => [...leadScoringKeys.all, 'rules'] as const,
  rule: (id: string) => [...leadScoringKeys.rules(), id] as const,
  leadsByScore: () => [...leadScoringKeys.all, 'leads-by-score'] as const,
};

// Types
interface GetLeadsByScoreParams {
  minScore?: number;
  maxScore?: number;
  limit?: number;
  offset?: number;
}

interface CreateScoringRuleData {
  name: string;
  description?: string;
  type: 'interaction' | 'field_value' | 'engagement' | 'custom';
  criteria: Record<string, any>;
  points: number;
  active?: boolean;
}

interface ScoringBreakdown {
  [ruleId: string]: number;
}

// Hooks
export const useLeadScore = (contactId: string) => {
  return useQuery({
    queryKey: leadScoringKeys.score(contactId),
    queryFn: async () => {
      const { data } = await api.get(`/api/lead-scoring/${contactId}`);
      return data as LeadScore;
    },
    enabled: !!contactId,
  });
};

export const useScoringRules = () => {
  return useQuery({
    queryKey: leadScoringKeys.rules(),
    queryFn: async () => {
      const { data } = await api.get('/api/lead-scoring/rules');
      // Handle different response formats
      if (Array.isArray(data)) {
        return data as LeadScoringRule[];
      }
      if (data && Array.isArray(data.rules)) {
        return data.rules as LeadScoringRule[];
      }
      if (data && Array.isArray(data.data)) {
        return data.data as LeadScoringRule[];
      }
      return [] as LeadScoringRule[];
    },
  });
};

export const useScoringRule = (id: string) => {
  return useQuery({
    queryKey: leadScoringKeys.rule(id),
    queryFn: async () => {
      const { data } = await api.get(`/api/lead-scoring/rules/${id}`);
      return data as LeadScoringRule;
    },
    enabled: !!id,
  });
};

export const useLeadsByScoreRange = (params?: GetLeadsByScoreParams) => {
  return useQuery({
    queryKey: leadScoringKeys.leadsByScore(),
    queryFn: async () => {
      const { data } = await api.get('/api/lead-scoring/leads/by-score', { params });
      return data as Array<{
        contactId: string;
        name: string;
        email?: string;
        score: number;
        scoreBreakdown: ScoringBreakdown;
      }>;
    },
  });
};

// Mutations
export const useCalculateLeadScore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const response = await api.post(`/api/lead-scoring/calculate/${contactId}`);
      return response.data as LeadScore;
    },
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.score(contactId) });
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.leadsByScore() });
    },
  });
};

export const useCreateScoringRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      // Ensure all required fields are present
      const ruleData = {
        name: data.name,
        description: data.description || '',
        type: data.type || 'interaction',
        points: parseInt(data.points) || 0,
        criteria: data.criteria || {},
        active: data.active !== undefined ? data.active : true,
      };
      
      const response = await api.post('/api/lead-scoring/rules', ruleData);
      // Backend returns rule directly
      return (response.data?.data || response.data) as LeadScoringRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.rules() });
    },
  });
};

export const useUpdateScoringRule = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<LeadScoringRule>) => {
      const response = await api.put(`/api/lead-scoring/rules/${id}`, data);
      return response.data as LeadScoringRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.rules() });
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.rule(id) });
    },
  });
};

export const useDeleteScoringRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/lead-scoring/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.rules() });
    },
  });
};

export const useRecalculateAllScores = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/lead-scoring/recalculate');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.all });
    },
  });
};
