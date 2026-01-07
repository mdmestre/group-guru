/**
 * React Query Client Configuration
 * Singleton para cache, retry policies e outras configurações globais
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Retry Strategy:
       * - Não falha na primeira tentativa
       * - Retry automático 1x após 1s
       * - Falha após 3 tentativas
       */
      retry: (failureCount, error: any) => {
        // Não retry em 401 (autenticação)
        if (error?.status === 401) return false;
        // Não retry em 404 (não encontrado)
        if (error?.status === 404) return false;
        // Retry até 3 vezes
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      /**
       * Stale Time: Quanto tempo dados são "frescos" antes de refetch
       * - Padrão: 0 (sempre considerar stale)
       * - Pode ser sobrescrito por hook individual
       */
      staleTime: 1000 * 60, // 1 minute

      /**
       * GC Time (garbage collection): Quanto tempo manter dados em memória
       * - Padrão: 5 minutos
       * - Após este tempo, dados são removidos se não forem usado
       */
      gcTime: 1000 * 60 * 5, // 5 minutes

      /**
       * Refetch policies
       */
      refetchOnWindowFocus: 'stale', // Refetch apenas se stale ao retomar aba
      refetchOnReconnect: 'stale',   // Refetch ao reconectar internet
      refetchOnMount: 'stale',       // Refetch ao montar se stale
    },
    mutations: {
      /**
       * Retry strategy para mutações é mais conservador
       */
      retry: (failureCount) => failureCount < 2,
      retryDelay: (attemptIndex) => 1000 * (attemptIndex + 1),
    },
  },
});

// Configuração específica por tipo de query pode ser feita nos hooks
// Exemplo: staleTime: 1000 * 30 para dados que mudam rápido
