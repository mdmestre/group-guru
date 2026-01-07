import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { usePipelines, usePipelineStages, useMoveContact } from '../hooks/usePipelines';
import PipelineStageColumn from './PipelineStageColumn';
import { PipelineDialog } from './PipelineDialog';
import { StageDialog } from './StageDialog';
import { LoadingState, ErrorState, EmptyState } from '@/components';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import styles from './PipelineBoard.module.css';
import { useQueryClient } from '@tanstack/react-query';
import { pipelineKeys } from '../hooks/usePipelines';
import { toast } from '@/hooks/use-toast';

interface PipelineBoardProps {
  pipelineId?: string;
  onCreatePipeline?: () => void;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({ pipelineId, onCreatePipeline }) => {
  const [selectedPipelineId, setSelectedPipelineId] = useState(pipelineId);
  const [isPipelineDialogOpen, setIsPipelineDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<any>(null);
  const queryClient = useQueryClient();
  
  const { data: pipelines, isLoading: pipelinesLoading, error: pipelinesError } = usePipelines();
  const { data: stages, isLoading: stagesLoading, error: stagesError } = usePipelineStages(selectedPipelineId || '');
  const moveContactMutation = useMoveContact();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Extract contactId and stageId from drag data
    const activeId = String(active.id);
    const overId = String(over.id);
    
    // active.id format: "contact-{contactId}"
    // over.id format: "stage-{stageId}"
    const contactId = activeId.replace('contact-', '');
    const stageId = overId.replace('stage-', '');

    if (contactId && stageId && contactId !== stageId) {
      moveContactMutation.mutate(
        {
          contactId,
          stageId,
          notes: 'Moved via drag and drop',
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: pipelineKeys.stages(selectedPipelineId || '') });
            toast({
              title: 'Sucesso',
              description: 'Contato movido com sucesso',
            });
          },
          onError: (error: any) => {
            toast({
              title: 'Erro',
              description: error.message || 'Erro ao mover contato',
              variant: 'destructive',
            });
          },
        }
      );
    }
  };

  const handleCreatePipeline = () => {
    setEditingPipeline(null);
    setIsPipelineDialogOpen(true);
  };

  const handleEditPipeline = (pipeline: any) => {
    setEditingPipeline(pipeline);
    setIsPipelineDialogOpen(true);
  };

  const handleCreateStage = () => {
    setIsStageDialogOpen(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
  };

  if (pipelinesLoading) return <LoadingState message="Carregando pipelines..." />;
  if (pipelinesError) return <ErrorState message="Erro ao carregar pipelines" onRetry={handleRefresh} />;
  if (!pipelines?.length) {
    return (
      <EmptyState
        title="Nenhum pipeline encontrado"
        description="Crie seu primeiro pipeline para começar a gerenciar seus negócios"
        actionLabel="Criar Pipeline"
        onAction={handleCreatePipeline}
      />
    );
  }

  const currentPipeline = pipelines.find(p => p.id === selectedPipelineId) || pipelines[0];
  const stageIds = stages?.map(s => s.id) || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.pipelineSelector}>
          <select
            value={selectedPipelineId || ''}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className={styles.select}
          >
            {pipelines.map(pipeline => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleEditPipeline(currentPipeline)}>
                Editar Pipeline
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateStage}>
                Adicionar Stage
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCreatePipeline} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Novo Pipeline
          </Button>
          <Button onClick={handleCreateStage} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Novo Stage
          </Button>
        </div>
      </div>

      {stagesLoading ? (
        <LoadingState message="Carregando stages..." />
      ) : stagesError ? (
        <ErrorState message="Erro ao carregar stages" onRetry={handleRefresh} />
      ) : !stages?.length ? (
        <EmptyState
          title="Nenhum stage encontrado"
          description="Adicione stages ao seu pipeline para começar"
          actionLabel="Adicionar Stage"
          onAction={handleCreateStage}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className={styles.board}>
            <SortableContext items={stageIds} strategy={verticalListSortingStrategy}>
              {stages.map(stage => (
                <PipelineStageColumn
                  key={stage.id}
                  stage={stage}
                  pipelineId={currentPipeline.id}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      )}

      {moveContactMutation.isPending && (
        <div className={styles.loadingOverlay}>Movendo contato...</div>
      )}

      {/* Pipeline Dialog */}
      <PipelineDialog
        open={isPipelineDialogOpen}
        onOpenChange={setIsPipelineDialogOpen}
        pipeline={editingPipeline}
        onSuccess={handleRefresh}
      />

      {/* Stage Dialog */}
      {selectedPipelineId && (
        <StageDialog
          open={isStageDialogOpen}
          onOpenChange={setIsStageDialogOpen}
          pipelineId={selectedPipelineId}
          maxPosition={stages?.length || 0}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
};

export default PipelineBoard;
