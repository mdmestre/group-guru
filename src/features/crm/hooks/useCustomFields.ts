import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { CustomField, CustomFieldValue } from '../models/custom-fields';

// Query Keys
export const customFieldKeys = {
  all: ['custom-fields'] as const,
  lists: () => [...customFieldKeys.all, 'list'] as const,
  list: (filters?: any) => [...customFieldKeys.lists(), { filters }] as const,
  details: () => [...customFieldKeys.all, 'detail'] as const,
  detail: (id: string) => [...customFieldKeys.details(), id] as const,
  values: (contactId: string) => [...customFieldKeys.all, 'values', contactId] as const,
};

// Types
interface CreateCustomFieldData {
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'checkbox' | 'textarea' | 'email' | 'phone' | 'url' | 'currency';
  description?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

interface SetFieldValueData {
  value: any;
}

interface BulkSetFieldValuesData {
  contactIds: string[];
  value: any;
}

// Hooks
export const useCustomFields = (filters?: any) => {
  return useQuery({
    queryKey: customFieldKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get('/api/custom-fields', { params: filters });
      // Handle different response formats
      if (Array.isArray(data)) {
        return data as CustomField[];
      }
      if (data && Array.isArray(data.fields)) {
        return data.fields as CustomField[];
      }
      if (data && Array.isArray(data.data)) {
        return data.data as CustomField[];
      }
      return [] as CustomField[];
    },
  });
};

export const useCustomField = (id: string) => {
  return useQuery({
    queryKey: customFieldKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/api/custom-fields/${id}`);
      return data as CustomField;
    },
    enabled: !!id,
  });
};

export const useCustomFieldValues = (contactId: string) => {
  return useQuery({
    queryKey: customFieldKeys.values(contactId),
    queryFn: async () => {
      const { data } = await api.get(`/api/custom-fields/values/${contactId}`);
      return data as CustomFieldValue[];
    },
    enabled: !!contactId,
  });
};

// Mutations
export const useCreateCustomField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      // Accept data from form (which has fieldType, label, etc.)
      // Map to backend format
      const backendData = {
        name: data.name || data.label,
        label: data.label || data.name,
        fieldType: data.fieldType || data.type,
        field_type: data.fieldType || data.type,
        description: data.description || '',
        isRequired: data.isRequired !== undefined ? data.isRequired : (data.required || false),
        is_required: data.isRequired !== undefined ? data.isRequired : (data.required || false),
        isUnique: data.isUnique !== undefined ? data.isUnique : false,
        is_unique: data.isUnique !== undefined ? data.isUnique : false,
        entityType: data.entityType || 'contact',
        entity_type: data.entityType || 'contact',
        defaultValue: data.defaultValue || '',
        default_value: data.defaultValue || '',
      };
      
      try {
        const response = await api.post('/api/custom-fields', backendData);
        // Backend returns field directly
        const field = (response.data?.data || response.data) as CustomField;
        return field;
      } catch (error: any) {
        console.error('[useCreateCustomField] Error:', error);
        throw new Error(error.message || 'Erro ao criar campo customizado');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.lists() });
    },
  });
};

export const useUpdateCustomField = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CreateCustomFieldData>) => {
      const response = await api.put(`/api/custom-fields/${id}`, data);
      return response.data as CustomField;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: customFieldKeys.lists() });
    },
  });
};

export const useDeleteCustomField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/custom-fields/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.lists() });
    },
  });
};

export const useSetFieldValue = (fieldId: string, contactId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SetFieldValueData) => {
      const response = await api.post(`/api/custom-fields/${fieldId}/values/${contactId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.values(contactId) });
    },
  });
};

export const useBulkSetFieldValues = (fieldId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkSetFieldValuesData) => {
      const response = await api.post('/api/custom-fields/bulk-set', { fieldId, ...data });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.all });
    },
  });
};

export const useValidateFieldValue = (fieldId: string) => {
  return useMutation({
    mutationFn: async (value: any) => {
      const response = await api.get(`/api/custom-fields/${fieldId}/validation`, { params: { value } });
      return response.data as { valid: boolean; errors?: string[] };
    },
  });
};
