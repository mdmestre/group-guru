/**
 * Conversations Page - Exemplo de refatoração completa
 * Este arquivo serve como template para outras páginas
 */

import { useState, useRef, useEffect } from 'react';
import { useConversations, useConversationMessages, useSendMessage, useMarkAsRead } from '@/hooks/useConversations';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Search, MoreVertical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SelectedConversation {
  conversationId: string;
  contactName: string;
  contactPhone: string;
}

export default function ConversationsPage() {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { 
    data: conversations, 
    isLoading: conversationsLoading, 
    error: conversationsError,
    refetch: refetchConversations 
  } = useConversations({ 
    searchTerm,
    sortBy: 'recent'
  });

  const { 
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages
  } = useConversationMessages(selectedConversation?.conversationId || '', {
    limit: 50,
    enabled: !!selectedConversation
  });

  const { mutate: sendMessage, isPending: sendingMessage } = useSendMessage();
  const { mutate: markAsRead } = useMarkAsRead();

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  // Marcar como lida ao selecionar
  useEffect(() => {
    if (selectedConversation && messagesData?.messages) {
      markAsRead(selectedConversation.conversationId);
    }
  }, [selectedConversation, messagesData]);

  const filteredConversations = conversations?.filter(conv =>
    conv.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contact.phone.includes(searchTerm)
  ) || [];

  // ========== JSX ==========

  return (
    <div className="h-screen flex flex-col bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-neutral-900">Conversas</h1>
        <p className="text-neutral-600">Atenda mensagens do WhatsApp em tempo real</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List - Sidebar */}
        <div className="w-80 bg-white border-r border-neutral-200 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-neutral-200">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Buscar conversa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversations */}
          {conversationsLoading ? (
            <LoadingState message="Carregando conversas..." fullHeight={false} />
          ) : conversationsError ? (
            <ErrorState
              message="Erro ao carregar conversas"
              onRetry={() => refetchConversations()}
              fullHeight={false}
            />
          ) : !filteredConversations?.length ? (
            <EmptyState
              icon={<MessageCircle className="h-12 w-12" />}
              title="Nenhuma conversa"
              description="Comece a conversar no WhatsApp"
              fullHeight={false}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-neutral-200">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation({
                      conversationId: conv.id,
                      contactName: conv.contact.name,
                      contactPhone: conv.contact.phone
                    })}
                    className={cn(
                      'w-full text-left p-4 hover:bg-neutral-50 transition-colors',
                      selectedConversation?.conversationId === conv.id && 'bg-primary-50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-neutral-900 truncate">
                        {conv.contact.name}
                      </h3>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-primary-600">{conv.unreadCount}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 truncate">
                      {conv.lastMessage?.text || 'Nenhuma mensagem'}
                    </p>
                    <p className="text-xs text-neutral-500 mt-2">
                      {format(new Date(conv.updatedAt), "HH:mm", { locale: ptBR })}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Area */}
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-white to-neutral-50">
            <EmptyState
              icon={<MessageCircle className="h-16 w-16" />}
              title="Selecione uma conversa"
              description="Clique em uma conversa para começar a responder"
              fullHeight={false}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-white">
            {/* Chat Header */}
            <div className="h-16 border-b border-neutral-200 px-6 flex items-center justify-between bg-neutral-50">
              <div>
                <h2 className="font-semibold text-neutral-900">
                  {selectedConversation.contactName}
                </h2>
                <p className="text-sm text-neutral-600">
                  {selectedConversation.contactPhone}
                </p>
              </div>
              <Button size="sm" variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messagesLoading ? (
                <LoadingState message="Carregando mensagens..." fullHeight={false} />
              ) : messagesError ? (
                <ErrorState
                  message="Erro ao carregar mensagens"
                  onRetry={() => refetchMessages()}
                  fullHeight={false}
                />
              ) : !messagesData?.messages?.length ? (
                <EmptyState
                  title="Nenhuma mensagem"
                  description="Comece a conversar"
                  fullHeight={false}
                />
              ) : (
                <>
                  {messagesData.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex',
                        message.direction === 'out' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-xs px-4 py-2 rounded-lg',
                          message.direction === 'out'
                            ? 'bg-primary-600 text-white'
                            : 'bg-neutral-200 text-neutral-900'
                        )}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className={cn(
                          'text-xs mt-1',
                          message.direction === 'out'
                            ? 'text-primary-100'
                            : 'text-neutral-600'
                        )}>
                          {format(new Date(message.timestamp), "HH:mm", { locale: ptBR })}
                          {message.direction === 'out' && (
                            <span className="ml-1">
                              {message.status === 'read' && '✓✓'}
                              {message.status === 'delivered' && '✓✓'}
                              {message.status === 'sent' && '✓'}
                              {message.status === 'failed' && '✗'}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="h-20 border-t border-neutral-200 px-6 py-4 flex gap-2">
              <Input
                id="message-input"
                placeholder="Digite sua mensagem..."
                disabled={sendingMessage}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const input = e.currentTarget;
                    const text = input.value.trim();
                    if (text && selectedConversation) {
                      sendMessage({
                        conversationId: selectedConversation.conversationId,
                        text
                      });
                      input.value = '';
                    }
                  }
                }}
              />
              <Button
                size="icon"
                className="bg-primary-600 hover:bg-primary-700"
                disabled={sendingMessage}
                onClick={() => {
                  const input = document.getElementById('message-input') as HTMLInputElement;
                  const text = input.value.trim();
                  if (text && selectedConversation) {
                    sendMessage({
                      conversationId: selectedConversation.conversationId,
                      text
                    });
                    input.value = '';
                  }
                }}
              >
                {sendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
