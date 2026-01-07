/**
 * Contacts Panel - Exibir lista de contatos reais
 */

import { useState } from 'react';
import { useContacts, useContactStats } from '@/hooks/useContacts';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Plus, MessageCircle } from 'lucide-react';

export function ContactsPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: contacts, isLoading, error, refetch } = useContacts();
  const { data: stats } = useContactStats();

  const filteredContacts = contacts?.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  ) || [];

  if (isLoading) {
    return <LoadingState message="Carregando contatos..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Erro ao carregar contatos'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Contatos</h2>
          <p className="text-neutral-600">Gerenciar seus contatos do WhatsApp</p>
        </div>
        <Button className="bg-primary-600 hover:bg-primary-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Contato
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-neutral-200">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-neutral-600 mb-1">Total de Contatos</p>
              <p className="text-3xl font-bold text-neutral-900">{stats.total}</p>
              <p className="text-xs text-neutral-500 mt-2">
                {stats.active} ativos • {stats.inactive} inativos
              </p>
            </CardContent>
          </Card>
          <Card className="border-neutral-200">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-neutral-600 mb-1">Com Mensagens</p>
              <p className="text-3xl font-bold text-neutral-900">{stats.withMessages}</p>
              <p className="text-xs text-neutral-500 mt-2">
                {((stats.withMessages / stats.total) * 100).toFixed(1)}% do total
              </p>
            </CardContent>
          </Card>
          <Card className="border-neutral-200">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-neutral-600 mb-1">Taxa de Resposta</p>
              <p className="text-3xl font-bold text-neutral-900">
                {stats.averageResponseTime ? `${(stats.averageResponseTime / 1000 / 60).toFixed(1)}m` : 'N/A'}
              </p>
              <p className="text-xs text-neutral-500 mt-2">Tempo médio</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={searchTerm ? 'Nenhum contato encontrado' : 'Nenhum contato'}
          description={searchTerm ? 'Tente outro termo de busca' : 'Comece a conversar no WhatsApp ou importe contatos'}
          actionLabel={searchTerm ? undefined : 'Conectar WhatsApp'}
          onAction={searchTerm ? undefined : () => window.location.href = '/app/connections'}
        />
      ) : (
        <Card className="border-neutral-200">
          <CardContent className="p-0">
            <div className="divide-y divide-neutral-200">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 hover:bg-neutral-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-neutral-900 truncate">{contact.name}</h4>
                    <p className="text-sm text-neutral-600">{contact.phone}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {contact.isActive && (
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                          Ativo
                        </Badge>
                      )}
                      {contact.messageCount > 0 && (
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                          {contact.messageCount} mensagens
                        </Badge>
                      )}
                      {contact.tags?.map(tag => (
                        <Badge key={tag} variant="outline" className="border-neutral-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-4 flex-shrink-0"
                    onClick={() => window.location.href = `/app/conversations?contact=${contact.id}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
