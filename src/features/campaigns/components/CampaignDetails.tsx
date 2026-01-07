/**
 * Campaign Details Component
 * Modal/Page showing detailed campaign information and real-time stats
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  useCampaign, 
  useCampaignStats, 
  useCampaignRecipients,
  usePauseCampaign, 
  useResumeCampaign, 
  useCancelCampaign,
  useDeleteCampaign
} from '../hooks/useCampaigns';
import { LoadingState, ErrorState } from '@/components';
import { Pause, Play, X, TrendingUp, CheckCircle2, XCircle, Clock, Send, Trash2 } from 'lucide-react';
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

interface CampaignDetailsProps {
  campaignId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CampaignDetails({ campaignId, isOpen, onClose }: CampaignDetailsProps) {
  const { data: campaign, isLoading, error } = useCampaign(campaignId || null);
  // Only poll stats if campaign is active
  const { data: stats } = useCampaignStats(campaignId || null, {
    refetchInterval: campaign?.status === 'running' || campaign?.status === 'paused' ? 5000 : false
  });
  const { data: recipients } = useCampaignRecipients(campaignId || '');
  const pauseMutation = usePauseCampaign();
  const resumeMutation = useResumeCampaign();
  const cancelMutation = useCancelCampaign();
  const deleteMutation = useDeleteCampaign();
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);

  if (!isOpen || !campaignId) {
    return null;
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <LoadingState message="Carregando detalhes..." />
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !campaign) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <ErrorState message="Erro ao carregar detalhes da campanha" />
        </DialogContent>
      </Dialog>
    );
  }

  const progress =
    campaign.recipientsCount > 0
      ? (campaign.sentCount / campaign.recipientsCount) * 100
      : 0;

  const deliveryRate =
    campaign.sentCount > 0 ? ((campaign.deliveredCount || 0) / campaign.sentCount) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign.name}</DialogTitle>
          <DialogDescription>
            {campaign.description || 'Detalhes da campanha'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status and Progress */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Status e Progresso</CardTitle>
                <Badge
                  variant={
                    campaign.status === 'completed'
                      ? 'default'
                      : campaign.status === 'running'
                      ? 'default'
                      : campaign.status === 'failed'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {campaign.status === 'running' && 'Em Execução'}
                  {campaign.status === 'paused' && 'Pausada'}
                  {campaign.status === 'scheduled' && 'Agendada'}
                  {campaign.status === 'completed' && 'Concluída'}
                  {campaign.status === 'failed' && 'Falhou'}
                  {campaign.status === 'cancelled' && 'Cancelada'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Progresso</span>
                  <span className="font-medium">
                    {campaign.sentCount} / {campaign.recipientsCount} (
                    {progress.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Send className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{campaign.sentCount}</p>
                  <p className="text-xs text-muted-foreground">Enviadas</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{campaign.deliveredCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Entregues</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{campaign.failedCount}</p>
                  <p className="text-xs text-muted-foreground">Falhas</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{deliveryRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Taxa Entrega</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Campanha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Tipo</p>
                  <p className="mt-1">
                    {campaign.type === 'broadcast' && 'Broadcast'}
                    {campaign.type === 'scheduled' && 'Agendada'}
                    {campaign.type === 'automated' && 'Automática'}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Velocidade</p>
                  <p className="mt-1">{campaign.messagesPerMinute} mensagens/minuto</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Criada em</p>
                  <p className="mt-1">
                    {new Date(campaign.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                {campaign.startedAt && (
                  <div>
                    <p className="font-medium text-muted-foreground">Iniciada em</p>
                    <p className="mt-1">
                      {new Date(campaign.startedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
                {campaign.completedAt && (
                  <div>
                    <p className="font-medium text-muted-foreground">Concluída em</p>
                    <p className="mt-1">
                      {new Date(campaign.completedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
                {campaign.scheduledFor && (
                  <div>
                    <p className="font-medium text-muted-foreground">Agendada para</p>
                    <p className="mt-1">
                      {new Date(campaign.scheduledFor).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mensagem</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.mediaUrl && (
                <div className="mb-3 p-2 bg-gray-100 rounded text-center text-sm">
                  [Mídia: {campaign.mediaType || 'imagem'}]
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{campaign.messageTemplate}</p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {(campaign.status === 'running' ||
              campaign.status === 'paused' ||
              campaign.status === 'scheduled') && (
              <>
                {campaign.status === 'running' && (
                  <Button
                    variant="outline"
                    onClick={() => pauseMutation.mutate(campaign.id)}
                    disabled={pauseMutation.isPending}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </Button>
                )}
                {campaign.status === 'paused' && (
                  <Button
                    variant="outline"
                    onClick={() => resumeMutation.mutate(campaign.id)}
                    disabled={resumeMutation.isPending}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Retomar
                  </Button>
                )}
                {(campaign.status === 'running' || campaign.status === 'paused') && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja cancelar esta campanha?')) {
                        cancelMutation.mutate(campaign.id);
                      }
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </>
            )}
            {(campaign.status === 'completed' ||
              campaign.status === 'failed' ||
              campaign.status === 'cancelled' ||
              campaign.status === 'draft') && (
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirm(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar Campanha
              </Button>
            )}
          </div>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deletar Campanha?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja deletar a campanha "{campaign?.name}"? 
                  <br />
                  <br />
                  Esta ação é <strong>irreversível</strong> e todos os dados relacionados serão permanentemente removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (campaign) {
                      deleteMutation.mutate(campaign.id, {
                        onSuccess: () => {
                          setDeleteConfirm(false);
                          onClose(); // Close the modal after deletion
                        }
                      });
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? 'Deletando...' : 'Deletar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}

