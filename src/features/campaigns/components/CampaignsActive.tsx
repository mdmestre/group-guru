/**
 * Campaigns Active Component
 * Dashboard showing active campaigns with real-time updates
 */

import React, { useState } from 'react';
import { useCampaigns, usePauseCampaign, useResumeCampaign, useCancelCampaign, useDeleteCampaign } from '../hooks/useCampaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingState, ErrorState, EmptyState } from '@/components';
import { CampaignDetails } from './CampaignDetails';
import { Pause, Play, X, Eye, TrendingUp, CheckCircle2, XCircle, Clock, Send, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import type { Campaign } from '../models/types';

export function CampaignsActive() {
  // Enable polling for active campaigns tab (user is viewing this tab)
  const { data: campaigns, isLoading, error } = useCampaigns({ 
    refetchInterval: undefined // Use smart polling based on active campaigns
  });
  const pauseMutation = usePauseCampaign();
  const resumeMutation = useResumeCampaign();
  const cancelMutation = useCancelCampaign();
  const deleteMutation = useDeleteCampaign();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Filter campaigns by status
  const filteredCampaigns = campaigns?.filter((campaign) => {
    if (selectedStatus === 'all') return true;
    return campaign.status === selectedStatus;
  }) || [];

  // Calculate overall stats
  const stats = campaigns?.reduce(
    (acc, campaign) => {
      acc.total += campaign.recipientsCount;
      acc.sent += campaign.sentCount;
      acc.delivered += campaign.deliveredCount || 0;
      acc.failed += campaign.failedCount;
      return acc;
    },
    { total: 0, sent: 0, delivered: 0, failed: 0 }
  ) || { total: 0, sent: 0, delivered: 0, failed: 0 };

  const deliveryRate = stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0;
  const successRate = stats.total > 0 ? ((stats.sent - stats.failed) / stats.total) * 100 : 0;

  // Ensure values are not NaN
  const safeDeliveryRate = isNaN(deliveryRate) ? 0 : deliveryRate;
  const safeSuccessRate = isNaN(successRate) ? 0 : successRate;

  if (isLoading) {
    return <LoadingState message="Carregando campanhas..." />;
  }

  if (error) {
    return <ErrorState message="Erro ao carregar campanhas" />;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{safeDeliveryRate.toFixed(1)}%</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Taxa de Entrega</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{safeSuccessRate.toFixed(1)}%</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Taxa de Sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-100">
                <Send className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{stats.sent}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Enviadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-100">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{stats.total - stats.sent}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filtrar por status:</span>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1 border rounded-md text-sm"
        >
          <option value="all">Todas</option>
          <option value="running">Em Execução</option>
          <option value="paused">Pausadas</option>
          <option value="scheduled">Agendadas</option>
          <option value="completed">Concluídas</option>
        </select>
      </div>

      {/* Campaigns List */}
      {!filteredCampaigns || filteredCampaigns.length === 0 ? (
        <EmptyState
          title="Nenhuma campanha encontrada"
          description="Crie sua primeira campanha para começar"
        />
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onPause={() => pauseMutation.mutate(campaign.id)}
              onResume={() => resumeMutation.mutate(campaign.id)}
              onCancel={() => cancelMutation.mutate(campaign.id)}
              onDelete={() => deleteMutation.mutate(campaign.id)}
              isPausing={pauseMutation.isPending}
              isResuming={resumeMutation.isPending}
              isCancelling={cancelMutation.isPending}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Campaign Details Modal */}
      <CampaignDetails
        campaignId={selectedCampaignId}
        isOpen={!!selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
      />
    </div>
  );
}

interface CampaignCardProps {
  campaign: Campaign;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
  isPausing: boolean;
  isResuming: boolean;
  isCancelling: boolean;
  isDeleting: boolean;
}

function CampaignCard({
  campaign,
  onPause,
  onResume,
  onCancel,
  onDelete,
  isPausing,
  isResuming,
  isCancelling,
  isDeleting
}: CampaignCardProps) {
  const [pauseConfirm, setPauseConfirm] = useState(false);
  const [resumeConfirm, setResumeConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  const progress =
    campaign.recipientsCount > 0
      ? (campaign.sentCount / campaign.recipientsCount) * 100
      : 0;

  const getStatusBadge = (status: Campaign['status']) => {
    const variants = {
      running: 'default',
      paused: 'secondary',
      scheduled: 'outline',
      completed: 'default',
      failed: 'destructive',
      draft: 'outline',
      cancelled: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status === 'running' && 'Em Execução'}
        {status === 'paused' && 'Pausada'}
        {status === 'scheduled' && 'Agendada'}
        {status === 'completed' && 'Concluída'}
        {status === 'failed' && 'Falhou'}
        {status === 'draft' && 'Rascunho'}
        {status === 'cancelled' && 'Cancelada'}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{campaign.name}</CardTitle>
            {campaign.description && (
              <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
            )}
          </div>
          {getStatusBadge(campaign.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progresso</span>
            <span className="font-medium">
              {campaign.sentCount} / {campaign.recipientsCount} ({progress.toFixed(1)}%)
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Enviadas</p>
            <p className="font-semibold">{campaign.sentCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Entregues</p>
            <p className="font-semibold">{campaign.deliveredCount || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Falhas</p>
            <p className="font-semibold text-destructive">{campaign.failedCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Taxa</p>
            <p className="font-semibold">{campaign.messagesPerMinute} msg/min</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {campaign.status === 'running' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPauseConfirm(true)}
                disabled={isPausing}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pausar
              </Button>
              <AlertDialog open={pauseConfirm} onOpenChange={setPauseConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Pausar Campanha?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A campanha "{campaign.name}" será pausada. Você poderá retomá-la depois.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onPause} disabled={isPausing}>
                      {isPausing ? 'Pausando...' : 'Pausar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {campaign.status === 'paused' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setResumeConfirm(true)}
                disabled={isResuming}
              >
                <Play className="h-4 w-4 mr-2" />
                Retomar
              </Button>
              <AlertDialog open={resumeConfirm} onOpenChange={setResumeConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Retomar Campanha?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A campanha "{campaign.name}" será retomada e continuará disparando mensagens.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onResume} disabled={isResuming}>
                      {isResuming ? 'Retomando...' : 'Retomar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {(campaign.status === 'running' || campaign.status === 'paused' || campaign.status === 'scheduled') && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setCancelConfirm(true)}
                disabled={isCancelling}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <AlertDialog open={cancelConfirm} onOpenChange={setCancelConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar Campanha?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A campanha "{campaign.name}" será cancelada e não poderá ser retomada. 
                      Já foram enviadas {campaign.sentCount} mensagens de {campaign.recipientsCount}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Manter</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onCancel} 
                      disabled={isCancelling}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isCancelling ? 'Cancelando...' : 'Cancelar Campanha'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedCampaignId(campaign.id)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalhes
            </Button>
            {(campaign.status === 'completed' || 
              campaign.status === 'failed' || 
              campaign.status === 'cancelled' || 
              campaign.status === 'draft') && (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </Button>
                <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deletar Campanha?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja deletar a campanha "{campaign.name}"? 
                        <br />
                        <br />
                        Esta ação é <strong>irreversível</strong> e todos os dados relacionados serão permanentemente removidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={onDelete} 
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Deletando...' : 'Deletar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

