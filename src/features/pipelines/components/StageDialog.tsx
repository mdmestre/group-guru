import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateStage, useUpdateStage } from '../hooks/usePipelines';
import { PipelineStage } from '../models/types';
import { toast } from '@/hooks/use-toast';

const stageSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  position: z.number().int().min(0, 'Posição deve ser um número positivo'),
  conversionProbability: z
    .number()
    .min(0, 'Probabilidade deve ser entre 0 e 100')
    .max(100, 'Probabilidade deve ser entre 0 e 100')
    .optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor inválida').optional(),
});

type StageFormData = z.infer<typeof stageSchema>;

interface StageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  stage?: PipelineStage;
  maxPosition?: number;
  onSuccess?: () => void;
}

export const StageDialog: React.FC<StageDialogProps> = ({
  open,
  onOpenChange,
  pipelineId,
  stage,
  maxPosition = 0,
  onSuccess,
}) => {
  const isEdit = !!stage;
  const createStage = useCreateStage(pipelineId);
  const updateStage = useUpdateStage(stage?.id || '');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      name: stage?.name || '',
      position: stage?.position ?? maxPosition + 1,
      conversionProbability: stage?.conversionProbability ?? 0,
      description: stage?.description || '',
      color: stage?.color || '#6b7280',
    },
  });

  React.useEffect(() => {
    if (stage) {
      reset({
        name: stage.name,
        position: stage.position,
        conversionProbability: stage.conversionProbability,
        description: stage.description || '',
        color: stage.color || '#6b7280',
      });
    } else {
      reset({
        name: '',
        position: maxPosition + 1,
        conversionProbability: 0,
        description: '',
        color: '#6b7280',
      });
    }
  }, [stage, reset, open, maxPosition]);

  const onSubmit = async (data: StageFormData) => {
    try {
      if (isEdit) {
        await updateStage.mutateAsync(data);
        toast({
          title: 'Sucesso',
          description: 'Stage atualizado com sucesso',
        });
      } else {
        await createStage.mutateAsync({
          name: data.name,
          position: data.position,
          conversionProbability: data.conversionProbability,
        });
        toast({
          title: 'Sucesso',
          description: 'Stage criado com sucesso',
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar stage',
        variant: 'destructive',
      });
    }
  };

  const isLoading = createStage.isPending || updateStage.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Stage' : 'Criar Stage'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do stage'
              : 'Adicione um novo stage ao pipeline'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stage-name">Nome *</Label>
            <Input
              id="stage-name"
              {...register('name')}
              placeholder="ex: Qualificação, Proposta, Fechamento"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Posição *</Label>
              <Input
                id="position"
                type="number"
                {...register('position', { valueAsNumber: true })}
                min={0}
                disabled={isLoading}
              />
              {errors.position && (
                <p className="text-sm text-red-600">{errors.position.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="conversionProbability">
                Probabilidade de Conversão (%)
              </Label>
              <Input
                id="conversionProbability"
                type="number"
                {...register('conversionProbability', { valueAsNumber: true })}
                min={0}
                max={100}
                disabled={isLoading}
              />
              {errors.conversionProbability && (
                <p className="text-sm text-red-600">
                  {errors.conversionProbability.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage-description">Descrição</Label>
            <Input
              id="stage-description"
              {...register('description')}
              placeholder="Descreva este stage"
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isEdit
                  ? 'Salvando...'
                  : 'Criando...'
                : isEdit
                ? 'Salvar'
                : 'Criar Stage'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

