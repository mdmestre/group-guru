import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreatePipeline, useUpdatePipeline } from '../hooks/usePipelines';
import { Pipeline } from '../models/types';
import { toast } from '@/hooks/use-toast';

const pipelineSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor inválida').optional(),
  icon: z.string().optional(),
});

type PipelineFormData = z.infer<typeof pipelineSchema>;

interface PipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline?: Pipeline;
  onSuccess?: () => void;
}

export const PipelineDialog: React.FC<PipelineDialogProps> = ({
  open,
  onOpenChange,
  pipeline,
  onSuccess,
}) => {
  const isEdit = !!pipeline;
  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline(pipeline?.id || '');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PipelineFormData>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: {
      name: pipeline?.name || '',
      description: pipeline?.description || '',
      color: pipeline?.color || '#3b82f6',
      icon: pipeline?.icon || '',
    },
  });

  React.useEffect(() => {
    if (pipeline) {
      reset({
        name: pipeline.name,
        description: pipeline.description || '',
        color: pipeline.color || '#3b82f6',
        icon: pipeline.icon || '',
      });
    } else {
      reset({
        name: '',
        description: '',
        color: '#3b82f6',
        icon: '',
      });
    }
  }, [pipeline, reset, open]);

  const onSubmit = async (data: PipelineFormData) => {
    try {
      if (isEdit) {
        await updatePipeline.mutateAsync(data);
        toast({
          title: 'Sucesso',
          description: 'Pipeline atualizado com sucesso',
        });
      } else {
        await createPipeline.mutateAsync(data);
        toast({
          title: 'Sucesso',
          description: 'Pipeline criado com sucesso',
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar pipeline',
        variant: 'destructive',
      });
    }
  };

  const isLoading = createPipeline.isPending || updatePipeline.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Pipeline' : 'Criar Pipeline'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize as informações do pipeline'
              : 'Crie um novo pipeline para gerenciar seus negócios'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="ex: Vendas, Marketing, Suporte"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descreva o propósito deste pipeline"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  {...register('color')}
                  className="w-20 h-10"
                  disabled={isLoading}
                />
                <Input
                  {...register('color')}
                  placeholder="#3b82f6"
                  disabled={isLoading}
                />
              </div>
              {errors.color && (
                <p className="text-sm text-red-600">{errors.color.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Ícone</Label>
              <Input
                id="icon"
                {...register('icon')}
                placeholder="ex: target, users, briefcase"
                disabled={isLoading}
              />
            </div>
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
                : 'Criar Pipeline'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

