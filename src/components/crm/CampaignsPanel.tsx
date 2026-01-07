/**
 * Campaigns Panel - Exibir lista de campanhas reais
 */

import { useState } from 'react';
import { useCampaigns, useCreateCampaign, useLaunchCampaign, useCancelCampaign } from '@/hooks/useCampaigns';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Search, 
  Plus, 
  Play, 
  Pause, 
  X,
  TrendingUp,
  Users,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CampaignsPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: campaigns, isLoading, error, refetch } = useCampaigns();
  const launchMutation = useLaunchCampaign();
  const cancelMutation = useCancelCampaign();

  const filteredCampaigns = campaigns?.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return <LoadingState message="Carregando campanhas..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Erro ao carregar campanhas'}
        onRetry={() => refetch()}
      />
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: 'outline', className: 'border-gray-200 bg-gray-50' },
      scheduled: { variant: 'outline', className: 'border-blue-200 bg-blue-50 text-blue-700' },
      active: { variant: 'outline', className: 'border-green-200 bg-green-50 text-green-700' },
      paused: { variant: 'outline', className: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
      completed: { variant: 'outline', className: 'border-purple-200 bg-purple-50 text-purple-700' },
      cancelled: { variant: 'outline', className: 'border-red-200 bg-red-50 text-red-700' }
    };
    
    const statusLabel: Record<string, string> = {
      draft: 'Rascunho',
      scheduled: 'Agendada',
      active: 'Ativa',
      paused: 'Pausada',
      completed: 'Concluída',
      cancelled: 'Cancelada'
    };

    return (
      <Badge {...variants[status]}>
        {statusLabel[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Campanhas</h2>
          <p className="text-neutral-600">Gerenciar campanhas de disparo em massa</p>
        </div>
        <Button className="bg-primary-600 hover:bg-primary-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Summary Cards */}
      {campaigns && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-neutral-200">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-neutral-600 mb-1">Total</p>
              <p className="text-3xl font-bold text-neutral-900">{campaigns.length}</p>
            </CardContent>
          </Card>
          <Card className="border-neutral-200">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-neutral-600 mb-1">Ativas</p>
              <p className="text-3xl font-bold text-green-600">
                {campaigns.filter(c => c.status === 'active').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-neutral-200">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-neutral-600 mb-1">Mensagens Enviadas</p>
              <p className="text-3xl font-bold text-neutral-900">
                {campaigns.reduce((sum, c) => sum + c.sentCount, 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-neutral-200">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-neutral-600 mb-1">Taxa Média</p>
              <p className="text-3xl font-bold text-neutral-900">
                {campaigns.length > 0
                  ? ((campaigns.reduce((sum, c) => sum + (c.sentCount / c.totalRecipients), 0) / campaigns.length) * 100).toFixed(1)
                  : '0'}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'].map(status => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? 'default' : 'outline'}
              onClick={() => setStatusFilter(statusFilter === status ? undefined : status)}
            >
              {status === 'draft' && 'Rascunho'}
              {status === 'scheduled' && 'Agendada'}
              {status === 'active' && 'Ativa'}
              {status === 'paused' && 'Pausada'}
              {status === 'completed' && 'Concluída'}
              {status === 'cancelled' && 'Cancelada'}
            </Button>
          ))}
        </div>
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-12 w-12" />}
          title={searchTerm ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha'}
          description={searchTerm ? 'Tente outro termo de busca' : 'Crie sua primeira campanha de disparo'}
          actionLabel={searchTerm ? undefined : 'Criar Campanha'}
          onAction={searchTerm ? undefined : () => window.location.href = '/app/crm?tab=campaigns&action=create'}
        />
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => {
            const deliveryRate = campaign.totalRecipients > 0 
              ? ((campaign.sentCount / campaign.totalRecipients) * 100).toFixed(1)
              : '0';
            
            return (
              <Card key={campaign.id} className="border-neutral-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-neutral-900">{campaign.name}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-neutral-600 mb-3">{campaign.description}</p>
                      )}
                      
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">Destinatários</p>
                          <p className="text-sm font-semibold text-neutral-900">
                            {campaign.sentCount}/{campaign.totalRecipients}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">Taxa de Entrega</p>
                          <p className="text-sm font-semibold text-neutral-900">{deliveryRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">Falhas</p>
                          <p className="text-sm font-semibold text-red-600">{campaign.failedCount}</p>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="w-full bg-neutral-200 rounded-full h-2 mb-3">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${deliveryRate}%` }}
                        />
                      </div>

                      {/* Timestamps */}
                      <p className="text-xs text-neutral-500">
                        Criada em {format(new Date(campaign.createdAt), "d 'de' MMMM", { locale: ptBR })}
                        {campaign.startedAt && ` • Iniciada em ${format(new Date(campaign.startedAt), "HH:mm")}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      {campaign.status === 'draft' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => launchMutation.mutate(campaign.id)}
                          disabled={launchMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Iniciar
                        </Button>
                      )}
                      {campaign.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-200"
                          onClick={() => cancelMutation.mutate(campaign.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pausar
                        </Button>
                      )}
                      {campaign.status === 'paused' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => launchMutation.mutate(campaign.id)}
                          disabled={launchMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Retomar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/app/crm/campaign/${campaign.id}`}
                      >
                        Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
