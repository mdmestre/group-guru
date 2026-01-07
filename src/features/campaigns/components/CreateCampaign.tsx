/**
 * Create Campaign Component
 * Multi-step form for creating campaigns
 * Phase 4: Disparos
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useCreateCampaign, useLaunchCampaign } from '../hooks/useCampaigns';
import { useConnections } from '@/hooks/useConnections';
import { useSegments } from '@/features/crm/hooks/useSegments';
import { LoadingState, ErrorState } from '@/components';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, Send, Calendar, Clock, Users, MessageSquare } from 'lucide-react';
import type { CreateCampaignInput } from '../models/types';

// Validation schema
const campaignSchema = z.object({
  connectionId: z.string().min(1, 'Conexão é obrigatória'),
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  description: z.string().optional(),
  type: z.enum(['broadcast', 'scheduled', 'automated']),
  messageTemplate: z.string().min(1, 'Mensagem é obrigatória'),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video', 'document', 'audio']).optional(),
  targetFilters: z.object({
    segmentIds: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    customField: z
      .object({
        field: z.string(),
        operator: z.string(),
        value: z.any()
      })
      .optional()
  }),
  messagesPerMinute: z.number().min(1).max(60).default(10),
  delayBetweenMessages: z.number().min(1000).default(6000),
  scheduledFor: z.string().optional(),
  sendNow: z.boolean().default(false)
});

type CampaignFormData = z.infer<typeof campaignSchema>;

const steps = [
  { id: 1, name: 'Básico', icon: MessageSquare },
  { id: 2, name: 'Destinatários', icon: Users },
  { id: 3, name: 'Mensagem', icon: MessageSquare },
  { id: 4, name: 'Agendamento', icon: Calendar }
];

export function CreateCampaign() {
  const [currentStep, setCurrentStep] = useState(1);
  const [estimatedRecipients, setEstimatedRecipients] = useState<number>(0);
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<CampaignFormData | null>(null);

  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const { data: segments, isLoading: segmentsLoading } = useSegments();
  const createMutation = useCreateCampaign();
  const launchMutation = useLaunchCampaign();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      type: 'broadcast',
      messagesPerMinute: 10,
      delayBetweenMessages: 6000,
      sendNow: false,
      targetFilters: {}
    }
  });

  const watchedValues = watch();

  // Calculate estimated recipients
  React.useEffect(() => {
    if (watchedValues.targetFilters?.segmentIds && watchedValues.targetFilters.segmentIds.length > 0) {
      // Estimate based on selected segments
      // This would ideally come from the API
      setEstimatedRecipients(100); // Placeholder
    } else {
      setEstimatedRecipients(0);
    }
  }, [watchedValues.targetFilters]);

  const onSubmitWithConfirm = async (data: CampaignFormData) => {
    if (data.sendNow && estimatedRecipients > 0) {
      // Show confirmation before launching
      setPendingFormData(data);
      setShowLaunchConfirm(true);
    } else {
      // Just create the campaign without launching
      await onSubmit(data);
    }
  };

  const onConfirmLaunch = async () => {
    if (pendingFormData) {
      await onSubmit(pendingFormData);
      setPendingFormData(null);
      setShowLaunchConfirm(false);
    }
  };

  const onSubmit = async (data: CampaignFormData) => {
    try {
      const campaignData: CreateCampaignInput = {
        connectionId: data.connectionId,
        name: data.name,
        description: data.description || undefined,
        type: data.type,
        messageTemplate: data.messageTemplate,
        mediaUrl: data.mediaUrl || undefined,
        mediaType: data.mediaType || undefined,
        targetFilters: data.targetFilters || {},
        messagesPerMinute: data.messagesPerMinute,
        delayBetweenMessages: data.delayBetweenMessages,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined
      };

      const campaign = await createMutation.mutateAsync(campaignData);

      // Launch immediately if sendNow is true
      if (data.sendNow && campaign) {
        await launchMutation.mutateAsync(campaign.id);
      }

      // Reset form and go back to step 1
      setCurrentStep(1);
      window.location.reload(); // Force refresh to show new campaign
    } catch (error) {
      console.error('Error creating campaign:', error);
      // Error is already handled by the mutation
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (connectionsLoading || segmentsLoading) {
    return <LoadingState message="Carregando dados..." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Nova Campanha</CardTitle>
        <CardDescription>
          Preencha os dados abaixo para criar uma nova campanha de envio em massa
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        isActive
                          ? 'border-primary bg-primary text-white'
                          : isCompleted
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300 bg-white text-gray-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`mt-2 text-sm font-medium ${
                        isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmitWithConfirm)} className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Ex: Promoção Ano Novo 2024"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Descreva o objetivo desta campanha"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="connectionId">Conexão WhatsApp *</Label>
                <Select
                  value={watchedValues.connectionId || ''}
                  onValueChange={(value) => setValue('connectionId', value)}
                >
                  <SelectTrigger className={errors.connectionId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione uma conexão" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections?.map((conn) => (
                      <SelectItem
                        key={conn.id}
                        value={conn.id}
                        disabled={conn.status !== 'connected'}
                      >
                        {conn.name || conn.phoneNumber} -{' '}
                        {conn.status === 'connected' ? '🟢 Conectado' : '🔴 Desconectado'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.connectionId && (
                  <p className="text-sm text-red-500 mt-1">{errors.connectionId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="type">Tipo de Campanha</Label>
                <Select
                  value={watchedValues.type || 'broadcast'}
                  onValueChange={(value: 'broadcast' | 'scheduled' | 'automated') =>
                    setValue('type', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broadcast">Broadcast (Imediato)</SelectItem>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="automated">Automática</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Recipients */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Selecione os Destinatários</Label>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="all-contacts"
                      name="recipientType"
                      value="all"
                      className="w-4 h-4"
                    />
                    <Label htmlFor="all-contacts" className="font-normal cursor-pointer">
                      Todos os contatos
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="segments"
                      name="recipientType"
                      value="segments"
                      className="w-4 h-4"
                      defaultChecked
                    />
                    <Label htmlFor="segments" className="font-normal cursor-pointer">
                      Por segmento
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <Label>Segmentos</Label>
                <Select
                  onValueChange={(value) => {
                    const current = watchedValues.targetFilters?.segmentIds || [];
                    if (!current.includes(value)) {
                      setValue('targetFilters.segmentIds', [...current, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um ou mais segmentos" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments && segments.length > 0 ? (
                      segments.map((segment) => (
                        <SelectItem key={segment.id} value={segment.id}>
                          {segment.name} ({segment.memberCount || 0} contatos)
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Nenhum segmento disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {watchedValues.targetFilters.segmentIds &&
                  watchedValues.targetFilters.segmentIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {watchedValues.targetFilters.segmentIds.map((segmentId) => {
                        const segment = segments?.find((s) => s.id === segmentId);
                        return (
                          <Badge
                            key={segmentId}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => {
                              const current = watchedValues.targetFilters?.segmentIds || [];
                              setValue(
                                'targetFilters.segmentIds',
                                current.filter((id) => id !== segmentId)
                              );
                            }}
                          >
                            {segment?.name} ×
                          </Badge>
                        );
                      })}
                    </div>
                  )}
              </div>

              {estimatedRecipients > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Total estimado de destinatários: <strong>{estimatedRecipients}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Message */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="messageTemplate">Mensagem *</Label>
                <Textarea
                  id="messageTemplate"
                  {...register('messageTemplate')}
                  placeholder="Digite sua mensagem aqui. Use {{nome}} para variáveis."
                  rows={8}
                  className={errors.messageTemplate ? 'border-red-500' : ''}
                />
                {errors.messageTemplate && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.messageTemplate.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Variáveis disponíveis: {`{{nome}}, {{email}}, {{telefone}}`}
                </p>
              </div>

              <div>
                <Label htmlFor="mediaUrl">URL da Mídia (Opcional)</Label>
                <Input
                  id="mediaUrl"
                  {...register('mediaUrl')}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>

              {watchedValues.mediaUrl && (
                <div>
                  <Label htmlFor="mediaType">Tipo de Mídia</Label>
                  <Select
                    value={watchedValues.mediaType || 'image'}
                    onValueChange={(value: 'image' | 'video' | 'document' | 'audio') =>
                      setValue('mediaType', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="document">Documento</SelectItem>
                      <SelectItem value="audio">Áudio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Preview */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-sm font-medium mb-2">Preview da Mensagem:</p>
                <div className="bg-white p-3 rounded border">
                  {watchedValues.mediaUrl && (
                    <div className="mb-2 p-2 bg-gray-100 rounded text-center text-sm">
                      [Mídia: {watchedValues.mediaType || 'imagem'}]
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">
                    {watchedValues.messageTemplate || 'Sua mensagem aparecerá aqui...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Scheduling */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sendNow"
                  checked={watchedValues.sendNow}
                  onCheckedChange={(checked) => setValue('sendNow', checked)}
                />
                <Label htmlFor="sendNow" className="font-normal cursor-pointer">
                  Disparar imediatamente
                </Label>
              </div>

              {!watchedValues.sendNow && (
                <>
                  <div>
                    <Label htmlFor="scheduledFor">Data e Hora do Disparo</Label>
                    <Input
                      id="scheduledFor"
                      type="datetime-local"
                      {...register('scheduledFor')}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="messagesPerMinute">Mensagens por Minuto</Label>
                <Input
                  id="messagesPerMinute"
                  type="number"
                  min="1"
                  max="60"
                  {...register('messagesPerMinute', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recomendado: 10-20 mensagens/minuto para evitar bloqueios
                </p>
              </div>

              <div>
                <Label htmlFor="delayBetweenMessages">Delay entre Mensagens (ms)</Label>
                <Input
                  id="delayBetweenMessages"
                  type="number"
                  min="1000"
                  step="1000"
                  {...register('delayBetweenMessages', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo de espera entre cada envio (em milissegundos)
                </p>
              </div>

              {estimatedRecipients > 0 && watchedValues.messagesPerMinute && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Tempo estimado de envio:{' '}
                    <strong>
                      {Math.ceil(estimatedRecipients / watchedValues.messagesPerMinute)} minutos
                    </strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            {currentStep < steps.length ? (
              <Button type="button" onClick={nextStep}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {watchedValues.sendNow ? (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Criar e Disparar
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Agendar Campanha
                  </>
                )}
              </Button>
            )}
          </div>
        </form>

        {/* Launch Confirmation Dialog */}
        <AlertDialog open={showLaunchConfirm} onOpenChange={setShowLaunchConfirm}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Disparo da Campanha</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a disparar uma campanha para aproximadamente{' '}
                <strong>{estimatedRecipients} contatos</strong>. 
                <br />
                <br />
                Nome: <strong>{pendingFormData?.name}</strong>
                <br />
                Mensagem: <strong>{pendingFormData?.messageTemplate.substring(0, 50)}...</strong>
                <br />
                <br />
                Esta ação é irreversível. Tem certeza que deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={onConfirmLaunch}
                disabled={createMutation.isPending || launchMutation.isPending}
                className="bg-primary"
              >
                {createMutation.isPending || launchMutation.isPending ? 'Disparando...' : 'Confirmar Disparo'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
