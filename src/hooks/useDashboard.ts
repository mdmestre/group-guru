/**
 * Hook para Dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/services/apiClient';
import { DashboardMetrics, DashboardActivity, DashboardConnectionStatus } from '@/types/dashboard';

const DASHBOARD_QUERY_KEY = ['dashboard'];

export const useDashboardMetrics = (options?: { enabled?: boolean; periodDays?: number }) => {
  const params = new URLSearchParams({
    periodDays: String(options?.periodDays || 30)
  });

  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, 'metrics', options?.periodDays],
    queryFn: async () => {
      const response = await ApiClient.get<{ metrics: DashboardMetrics }>(
        `/dashboard/metrics?${params}`
      );
      return response.metrics;
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5,
    ...options
  });
};

export const useDashboardActivities = (limit: number = 10) => {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, 'activities', limit],
    queryFn: async () => {
      const response = await ApiClient.get<{ activities: DashboardActivity[] }>(
        `/dashboard/activities?limit=${limit}`
      );
      return response.activities;
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5
  });
};

export const useDashboardConnections = () => {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, 'connections'],
    queryFn: async () => {
      const response = await ApiClient.get<{ connections: DashboardConnectionStatus[] }>(
        '/dashboard/connections'
      );
      return response.connections;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5
  });
};

/**
 * Hook para invalidar dados do dashboard em tempo real
 */
export const useDashboardRealtime = () => {
  const invalidateMetrics = (periodDays: number = 30) => {
    // Invalidate via useQueryClient em um Provider
  };

  const invalidateActivities = () => {
    // Invalidate via useQueryClient em um Provider
  };

  const invalidateConnections = () => {
    // Invalidate via useQueryClient em um Provider
  };

  return {
    invalidateMetrics,
    invalidateActivities,
    invalidateConnections
  };
};
