/**
 * Automation Hooks
 * React Query hooks for automation operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Automation,
  CreateAutomationInput,
  UpdateAutomationInput,
  TestAutomationInput,
  AutomationTestResult,
  AutomationRun,
  AutomationLog
} from '../models/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get all automations
 */
export function useAutomations() {
  return useQuery<Automation[]>({
    queryKey: ['automations'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/automations`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch automations');
      }

      return response.json();
    }
  });
}

/**
 * Get a single automation
 */
export function useAutomation(id: string | null) {
  return useQuery<Automation>({
    queryKey: ['automations', id],
    queryFn: async () => {
      if (!id) throw new Error('Automation ID is required');

      const response = await fetch(`${API_URL}/api/automations/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch automation');
      }

      return response.json();
    },
    enabled: !!id
  });
}

/**
 * Create automation mutation
 */
export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation<Automation, Error, CreateAutomationInput>({
    mutationFn: async (input) => {
      const response = await fetch(`${API_URL}/api/automations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create automation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação criada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao criar automação: ${error.message}`);
    }
  });
}

/**
 * Update automation mutation
 */
export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation<
    Automation,
    Error,
    { id: string; input: UpdateAutomationInput }
  >({
    mutationFn: async ({ id, input }) => {
      const response = await fetch(`${API_URL}/api/automations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update automation');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['automations', data.id] });
      toast.success('Automação atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar automação: ${error.message}`);
    }
  });
}

/**
 * Delete automation mutation
 */
export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`${API_URL}/api/automations/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete automation');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação deletada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao deletar automação: ${error.message}`);
    }
  });
}

/**
 * Get automation runs
 */
export function useAutomationRuns(automationId?: string) {
  return useQuery<AutomationRun[]>({
    queryKey: ['automations', automationId, 'runs'],
    queryFn: async () => {
      const url = automationId
        ? `${API_URL}/api/automations/${automationId}/runs`
        : `${API_URL}/api/automations/runs`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch automation runs');
      }

      return response.json();
    },
    enabled: !!automationId
  });
}

/**
 * Get automation logs
 */
export function useAutomationLogs(runId: string | null) {
  return useQuery<AutomationLog[]>({
    queryKey: ['automations', 'runs', runId, 'logs'],
    queryFn: async () => {
      if (!runId) throw new Error('Run ID is required');

      const response = await fetch(
        `${API_URL}/api/automations/runs/${runId}/logs`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch automation logs');
      }

      return response.json();
    },
    enabled: !!runId
  });
}

/**
 * Test automation mutation
 */
export function useTestAutomation() {
  return useMutation<AutomationTestResult, Error, TestAutomationInput>({
    mutationFn: async (input) => {
      const response = await fetch(
        `${API_URL}/api/automations/${input.automationId}/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(input)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to test automation');
      }

      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Teste executado com sucesso!');
      } else {
        toast.error('Teste falhou. Verifique os logs.');
      }
    },
    onError: (error) => {
      toast.error(`Erro ao testar automação: ${error.message}`);
    }
  });
}

