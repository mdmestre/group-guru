/**
 * Campaign History Component
 * Table showing campaign history with filters
 */

import React, { useState } from 'react';
import { useCampaigns, useDeleteCampaign } from '../hooks/useCampaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState } from '@/components';
import { Search, Copy, Trash2, Eye } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';
import type { Campaign } from '../models/types';

export function CampaignHistory() {
  // Disable polling for history tab (static data, no need for real-time updates)
  const { data: campaigns, isLoading, error } = useCampaigns({ 
    refetchInterval: false // No polling needed for historical data
  });
  const deleteMutation = useDeleteCampaign();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Filter campaigns
  const filteredCampaigns =
    campaigns?.filter((campaign) => {
      // Search filter
      if (searchQuery && !campaign.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && campaign.status !== statusFilter) {
        return false;
      }

      return true;
    }) || [];

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

    const labels = {
      running: 'Em Execução',
      paused: 'Pausada',
      scheduled: 'Agendada',
      completed: 'Concluída',
      failed: 'Falhou',
      draft: 'Rascunho',
      cancelled: 'Cancelada'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>
    );
  };

  const calculateSuccessRate = (campaign: Campaign) => {
    if (campaign.recipientsCount === 0) return 0;
    const success = campaign.sentCount - campaign.failedCount;
    return ((success / campaign.recipientsCount) * 100).toFixed(1);
  };

  if (isLoading) {
    return <LoadingState message="Carregando histórico..." />;
  }

  if (error) {
    return <ErrorState message="Erro ao carregar histórico" />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">Todos os status</option>
              <option value="completed">Concluídas</option>
              <option value="running">Em Execução</option>
              <option value="paused">Pausadas</option>
              <option value="scheduled">Agendadas</option>
              <option value="failed">Falhas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {!filteredCampaigns || filteredCampaigns.length === 0 ? (
        <EmptyState
          title="Nenhuma campanha encontrada"
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Tente ajustar os filtros'
              : 'Crie sua primeira campanha para começar'
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Enviadas</TableHead>
                  <TableHead>Taxa de Sucesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      {campaign.startedAt
                        ? new Date(campaign.startedAt).toLocaleDateString('pt-BR')
                        : campaign.createdAt
                        ? new Date(campaign.createdAt).toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {campaign.sentCount} / {campaign.recipientsCount}
                    </TableCell>
                    <TableCell>{calculateSuccessRate(campaign)}%</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            ⋮
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteConfirmId(campaign.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a campanha "{campaigns?.find(c => c.id === deleteConfirmId)?.name}"? 
              <br />
              <br />
              Esta ação é <strong>irreversível</strong> e todos os dados relacionados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  deleteMutation.mutate(deleteConfirmId, {
                    onSuccess: () => {
                      setDeleteConfirmId(null);
                    }
                  });
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
