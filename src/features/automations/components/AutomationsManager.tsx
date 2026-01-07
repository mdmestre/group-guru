/**
 * Automations Manager Component
 * Main interface for managing automations
 * Phase 3: Intelligent Automations
 */

import React, { useState } from 'react';
import { WorkflowBuilder } from './WorkflowBuilder';
import {
  useAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  useTestAutomation
} from '../hooks/useAutomations';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Settings,
  Eye
} from 'lucide-react';
import { LoadingState, ErrorState, EmptyState } from '@/components';
import type {
  Automation,
  CreateAutomationInput,
  TriggerType,
  FlowDefinition
} from '../models/types';

export function AutomationsManager() {
  const [selectedAutomation, setSelectedAutomation] =
    useState<Automation | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'builder'>('list');

  const { data: automations, isLoading, error } = useAutomations();
  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation();
  const deleteMutation = useDeleteAutomation();
  const testMutation = useTestAutomation();

  const handleCreate = async (input: CreateAutomationInput) => {
    await createMutation.mutateAsync(input);
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = async (id: string, input: Partial<Automation>) => {
    await updateMutation.mutateAsync({ id, input });
    setIsEditDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta automação?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleTest = async (id: string) => {
    await testMutation.mutateAsync({
      automationId: id,
      dryRun: true
    });
  };

  const handleToggleActive = async (automation: Automation) => {
    await updateMutation.mutateAsync({
      id: automation.id,
      input: { isActive: !automation.isActive }
    });
  };

  if (isLoading) {
    return <LoadingState message="Carregando automações..." />;
  }

  if (error) {
    return <ErrorState message="Erro ao carregar automações" />;
  }

  if (viewMode === 'builder' && selectedAutomation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Editando: {selectedAutomation.name}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode('list')}
            >
              Voltar
            </Button>
            <Button
              onClick={() =>
                handleUpdate(selectedAutomation.id, {
                  flowDefinition: selectedAutomation.flowDefinition
                })
              }
            >
              Salvar
            </Button>
          </div>
        </div>
        <WorkflowBuilder
          initialFlow={selectedAutomation.flowDefinition}
          onSave={(flow) => {
            handleUpdate(selectedAutomation.id, { flowDefinition: flow });
          }}
          onTest={() => handleTest(selectedAutomation.id)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automações</h2>
          <p className="text-muted-foreground">
            Crie e gerencie automações inteligentes
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Automação
            </Button>
          </DialogTrigger>
          <CreateAutomationDialog
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </Dialog>
      </div>

      {!automations || automations.length === 0 ? (
        <EmptyState
          title="Nenhuma automação criada"
          description="Comece criando sua primeira automação"
          action={
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Automação
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Execuções</TableHead>
                <TableHead>Última Execução</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {automations.map((automation) => (
                <TableRow key={automation.id}>
                  <TableCell className="font-medium">
                    {automation.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{automation.triggerType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.isActive && !automation.isPaused}
                        onCheckedChange={() => handleToggleActive(automation)}
                      />
                      <span className="text-sm">
                        {automation.isActive && !automation.isPaused
                          ? 'Ativa'
                          : 'Inativa'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {automation.totalRuns} ({automation.successfulRuns} sucesso)
                  </TableCell>
                  <TableCell>
                    {automation.lastRunAt
                      ? new Date(automation.lastRunAt).toLocaleDateString('pt-BR')
                      : 'Nunca'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAutomation(automation);
                          setViewMode('builder');
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTest(automation.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(automation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

interface CreateAutomationDialogProps {
  onSubmit: (input: CreateAutomationInput) => void;
  onCancel: () => void;
}

function CreateAutomationDialog({
  onSubmit,
  onCancel
}: CreateAutomationDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('message_received');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const flowDefinition: FlowDefinition = {
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 100 },
          data: {
            triggerType,
            config: {}
          }
        }
      ],
      edges: []
    };

    onSubmit({
      name,
      description,
      flowDefinition,
      triggerType,
      triggerConfig: {},
      isActive: true
    });
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Criar Nova Automação</DialogTitle>
        <DialogDescription>
          Configure a automação básica. Você poderá editar o workflow depois.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ex: Boas-vindas para novos contatos"
          />
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o que esta automação faz"
          />
        </div>
        <div>
          <Label htmlFor="triggerType">Tipo de Trigger *</Label>
          <Select
            value={triggerType}
            onValueChange={(value) => setTriggerType(value as TriggerType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="message_received">
                Mensagem Recebida
              </SelectItem>
              <SelectItem value="contact_created">Contato Criado</SelectItem>
              <SelectItem value="field_changed">Campo Alterado</SelectItem>
              <SelectItem value="tag_added">Tag Adicionada</SelectItem>
              <SelectItem value="stage_changed">Estágio Alterado</SelectItem>
              <SelectItem value="schedule">Agendado</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Criar</Button>
        </div>
      </form>
    </DialogContent>
  );
}

