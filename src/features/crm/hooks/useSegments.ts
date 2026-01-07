import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Segment, SegmentCriteria } from '../models/segments';

// Query Keys
export const segmentKeys = {
  all: ['segments'] as const,
  lists: () => [...segmentKeys.all, 'list'] as const,
  list: (filters?: any) => [...segmentKeys.lists(), { filters }] as const,
  details: () => [...segmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...segmentKeys.details(), id] as const,
  members: (id: string) => [...segmentKeys.detail(id), 'members'] as const,
};

// Types
interface CreateSegmentData {
  name: string;
  description?: string;
  criteria: SegmentCriteria; // Changed from SegmentCriteria[] to SegmentCriteria
  filterLogic?: 'AND' | 'OR';
}

interface UpdateSegmentData {
  name?: string;
  description?: string;
  criteria?: SegmentCriteria[];
  filterLogic?: 'AND' | 'OR';
}

interface EvaluateSegmentData {
  criteria: SegmentCriteria[];
  filterLogic?: 'AND' | 'OR';
}

interface SegmentMember {
  contactId: string;
  name: string;
  email?: string;
  phone?: string;
  addedAt: string;
}

interface ExecuteSegmentActionData {
  actionType: 'add_tag' | 'send_email' | 'assign_owner' | 'update_field';
  actionData: Record<string, any>;
}

// Hooks
export const useSegments = (filters?: any) => {
  return useQuery({
    queryKey: segmentKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/api/segments', { params: filters });
      // Handle different response formats
      if (Array.isArray(data)) {
        return data as Segment[];
      }
      if (data && Array.isArray(data.segments)) {
        return data.segments as Segment[];
      }
      if (data && Array.isArray(data.data)) {
        return data.data as Segment[];
      }
      return [] as Segment[];
    },
  });
};

export const useSegment = (id: string) => {
  return useQuery({
    queryKey: segmentKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/api/segments/${id}`);
      return data as Segment;
    },
    enabled: !!id,
  });
};

export const useSegmentMembers = (segmentId: string, page?: number) => {
  return useQuery({
    queryKey: [...segmentKeys.members(segmentId), page],
    queryFn: async () => {
      const { data } = await api.get(`/api/segments/${segmentId}/members`, {
        params: { page, limit: 50 },
      });
      return data as {
        members: SegmentMember[];
        total: number;
        page: number;
      };
    },
    enabled: !!segmentId,
  });
};

// Mutations
export const useCreateSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      // Ensure criteria is in the correct format
      const segmentData = {
        name: data.name,
        description: data.description || '',
        criteria: data.criteria || { rules: [] }, // Ensure it's an object with rules
        filterLogic: data.filterLogic || 'AND',
      };
      
      const response = await api.post('/api/segments', segmentData);
      // Backend returns segment directly
      return (response.data?.data || response.data) as Segment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
    },
  });
};

export const useUpdateSegment = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSegmentData) => {
      const response = await api.put(`/api/segments/${id}`, data);
      return response.data as Segment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: segmentKeys.members(id) });
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
    },
  });
};

export const useDeleteSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/segments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
    },
  });
};

export const useEvaluateSegment = () => {
  return useMutation({
    mutationFn: async (data: EvaluateSegmentData) => {
      const response = await api.post('/api/segments/evaluate', data);
      return response.data as {
        reach: number;
        members: SegmentMember[];
        preview: boolean;
      };
    },
  });
};

export const useRefreshSegmentMembers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segmentId: string) => {
      // The refresh endpoint might be POST /api/segments/:id/members/refresh or similar
      // For now, we'll use the evaluate endpoint to refresh
      const response = await api.post(`/api/segments/${segmentId}/members/refresh`);
      return response.data;
    },
    onSuccess: (_, segmentId) => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.members(segmentId) });
      queryClient.invalidateQueries({ queryKey: segmentKeys.detail(segmentId) });
    },
  });
};

export const useExecuteSegmentAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      segmentId,
      data,
    }: {
      segmentId: string;
      data: ExecuteSegmentActionData;
    }) => {
      const response = await api.post(`/api/segments/${segmentId}/actions`, data);
      return response.data;
    },
    onSuccess: (_, { segmentId }) => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.members(segmentId) });
    },
  });
};
