/**
 * Hook para Conversas (em tempo real)
 * Refatoração completa para dados reais
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/services/apiClient';
import { Conversation, Message } from '@/types/contact';

const CONVERSATIONS_QUERY_KEY = ['conversations'];
const MESSAGES_QUERY_KEY = ['messages'];

/**
 * Listar todas as conversas do usuário
 * Stale time baixo pois conversas mudam frequentemente
 */
export const useConversations = (options?: {
  enabled?: boolean;
  searchTerm?: string;
  sortBy?: 'recent' | 'unread' | 'alpha';
}) => {
  return useQuery({
    queryKey: [CONVERSATIONS_QUERY_KEY, options?.searchTerm, options?.sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(options?.searchTerm && { search: options.searchTerm }),
        ...(options?.sortBy && { sortBy: options.sortBy })
      });
      const response = await ApiClient.get<{ conversations: Conversation[] }>(
        `/conversations?${params}`
      );
      return response.conversations;
    },
    staleTime: 1000 * 30, // 30 segundos
    gcTime: 1000 * 60 * 5,
    ...options
  });
};

/**
 * Conversa específica com mensagens
 */
export const useConversation = (conversationId: string) => {
  return useQuery({
    queryKey: [...CONVERSATIONS_QUERY_KEY, conversationId],
    queryFn: async () => {
      const response = await ApiClient.get<{ conversation: Conversation }>(
        `/conversations/${conversationId}`
      );
      return response.conversation;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    enabled: !!conversationId
  });
};

/**
 * Mensagens com paginação (infinite scroll pattern)
 * Carregar 50 mensagens por página
 */
export const useConversationMessages = (
  conversationId: string,
  options?: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: [
      ...MESSAGES_QUERY_KEY,
      conversationId,
      'list',
      options?.limit,
      options?.offset
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(options?.limit || 50),
        offset: String(options?.offset || 0)
      });
      const response = await ApiClient.get<{
        messages: Message[];
        total: number;
        hasMore: boolean;
      }>(`/conversations/${conversationId}/messages?${params}`);
      return response;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    enabled: !!conversationId && options?.enabled !== false
  });
};

/**
 * Enviar mensagem
 * Atualiza cache automaticamente com dados otimistas
 */
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      text,
      mediaUrl,
      mediaType
    }: {
      conversationId: string;
      text: string;
      mediaUrl?: string;
      mediaType?: 'image' | 'video' | 'audio' | 'document';
    }) => {
      const response = await ApiClient.post<{ message: Message }>(
        `/conversations/${conversationId}/messages`,
        { text, mediaUrl, mediaType }
      );
      return response.message;
    },
    onMutate: async ({ conversationId, text }) => {
      // Otimistic update
      await queryClient.cancelQueries({
        queryKey: [MESSAGES_QUERY_KEY, conversationId]
      });

      // Salvar estado anterior para rollback se necessário
      const previousMessages = queryClient.getQueryData([
        MESSAGES_QUERY_KEY,
        conversationId,
        'list'
      ]);

      // Adicionar mensagem otimista
      queryClient.setQueryData(
        [MESSAGES_QUERY_KEY, conversationId, 'list'],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [
              ...old.messages,
              {
                id: `temp-${Date.now()}`,
                conversationId,
                text,
                direction: 'out',
                status: 'sent',
                timestamp: new Date().toISOString()
              }
            ]
          };
        }
      );

      return { previousMessages };
    },
    onSuccess: (_, { conversationId }) => {
      // Invalidate messages
      queryClient.invalidateQueries({
        queryKey: [MESSAGES_QUERY_KEY, conversationId]
      });
      // Invalidate conversation (para atualizar lastMessage)
      queryClient.invalidateQueries({
        queryKey: [...CONVERSATIONS_QUERY_KEY, conversationId]
      });
      // Invalidate conversations list (para atualizar ordem)
      queryClient.invalidateQueries({
        queryKey: CONVERSATIONS_QUERY_KEY
      });
    },
    onError: (_, __, context) => {
      // Rollback em caso de erro
      if (context?.previousMessages) {
        queryClient.setQueryData(
          [MESSAGES_QUERY_KEY, context.previousMessages],
          context.previousMessages
        );
      }
    }
  });
};

/**
 * Marcar conversa como lida
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      await ApiClient.post(`/conversations/${conversationId}/mark-as-read`);
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({
        queryKey: [...CONVERSATIONS_QUERY_KEY, conversationId]
      });
      queryClient.invalidateQueries({
        queryKey: CONVERSATIONS_QUERY_KEY
      });
    }
  });
};

/**
 * Mutar conversa (silenciar)
 */
export const useMuteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      await ApiClient.post(`/conversations/${conversationId}/mute`);
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({
        queryKey: [...CONVERSATIONS_QUERY_KEY, conversationId]
      });
    }
  });
};

/**
 * Fixar conversa
 */
export const usePinConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      await ApiClient.post(`/conversations/${conversationId}/pin`);
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({
        queryKey: [...CONVERSATIONS_QUERY_KEY, conversationId]
      });
      queryClient.invalidateQueries({
        queryKey: CONVERSATIONS_QUERY_KEY
      });
    }
  });
};

/**
 * Hook para invalidar conversas em tempo real via Socket.IO
 * Use no SocketProvider para reagir a eventos
 */
export const useConversationsRealtime = () => {
  const queryClient = useQueryClient();

  const invalidateConversations = () => {
    queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
  };

  const invalidateConversation = (conversationId: string) => {
    queryClient.invalidateQueries({
      queryKey: [...CONVERSATIONS_QUERY_KEY, conversationId]
    });
  };

  const invalidateMessages = (conversationId: string) => {
    queryClient.invalidateQueries({
      queryKey: [MESSAGES_QUERY_KEY, conversationId]
    });
  };

  const addOptimisticMessage = (conversationId: string, message: Message) => {
    queryClient.setQueryData(
      [MESSAGES_QUERY_KEY, conversationId, 'list'],
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, message]
        };
      }
    );
  };

  return {
    invalidateConversations,
    invalidateConversation,
    invalidateMessages,
    addOptimisticMessage
  };
};
