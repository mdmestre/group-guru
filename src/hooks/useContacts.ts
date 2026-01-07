/**
 * Hook para Contatos
 * Utiliza React Query para cache e sincronização
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/services/apiClient';
import { Contact, ContactStats, Message, Conversation } from '@/types/contact';

const CONTACTS_QUERY_KEY = ['contacts'];
const CONVERSATIONS_QUERY_KEY = ['conversations'];
const MESSAGES_QUERY_KEY = ['messages'];

export const useContacts = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: CONTACTS_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.get<{ contacts: Contact[] }>('/contacts');
      return response.contacts;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (garbage collection)
    ...options
  });
};

export const useContactStats = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['contactStats'],
    queryFn: async () => {
      const response = await ApiClient.get<{ stats: ContactStats }>('/contacts/stats');
      return response.stats;
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5,
    ...options
  });
};

export const useConversations = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: async () => {
      const response = await ApiClient.get<{ conversations: Conversation[] }>('/conversations');
      return response.conversations;
    },
    staleTime: 1000 * 30, // 30 seconds (conversations update more frequently)
    gcTime: 1000 * 60 * 5,
    ...options
  });
};

export const useConversation = (contactId: string) => {
  return useQuery({
    queryKey: [...CONVERSATIONS_QUERY_KEY, contactId],
    queryFn: async () => {
      const response = await ApiClient.get<{ conversation: Conversation }>(
        `/conversations/${contactId}`
      );
      return response.conversation;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    enabled: !!contactId
  });
};

export const useMessages = (conversationId: string, options?: { limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: [...MESSAGES_QUERY_KEY, conversationId, options?.limit, options?.offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(options?.limit || 50),
        offset: String(options?.offset || 0)
      });
      const response = await ApiClient.get<{ messages: Message[]; total: number }>(
        `/conversations/${conversationId}/messages?${params}`
      );
      return response;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    enabled: !!conversationId
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) => {
      const response = await ApiClient.post<{ message: Message }>(
        `/conversations/${conversationId}/messages`,
        { text }
      );
      return response.message;
    },
    onSuccess: (_, variables) => {
      // Invalidate conversation messages
      queryClient.invalidateQueries({
        queryKey: [...MESSAGES_QUERY_KEY, variables.conversationId]
      });
      // Invalidate conversation list
      queryClient.invalidateQueries({
        queryKey: CONVERSATIONS_QUERY_KEY
      });
    }
  });
};

/**
 * Hook para revalidar contatos em tempo real via Socket.IO
 * Use em contexto global ou provider
 */
export const useContactsRealtime = () => {
  const queryClient = useQueryClient();

  const invalidateContacts = () => {
    queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
  };

  const invalidateConversations = () => {
    queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
  };

  const invalidateMessages = (conversationId?: string) => {
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: [...MESSAGES_QUERY_KEY, conversationId] });
    } else {
      queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });
    }
  };

  return {
    invalidateContacts,
    invalidateConversations,
    invalidateMessages
  };
};
