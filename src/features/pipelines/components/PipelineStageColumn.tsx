import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePipelineStats } from '../hooks/usePipelines';
import { PipelineStage } from '../models/types';
import PipelineContact from './PipelineContact';
import { LoadingState } from '@/components';
import styles from './PipelineStageColumn.module.css';

interface PipelineStageColumnProps {
  stage: PipelineStage;
  pipelineId: string;
}

export const PipelineStageColumn: React.FC<PipelineStageColumnProps> = ({ stage, pipelineId }) => {
  const { data: stats, isLoading } = usePipelineStats(stage.id);
  const { setNodeRef } = useDroppable({ id: `stage-${stage.id}` });
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition } = useSortable({
    id: `stage-${stage.id}`,
  });

  const contactIds = stage.contactIds || [];
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={styles.column}
      {...attributes}
      {...listeners}
    >
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{stage.name}</h3>
          <p className={styles.stats}>
            {isLoading ? (
              <span className="text-xs text-neutral-400">Carregando...</span>
            ) : (
              <>
                <span className={styles.count}>
                  {contactIds.length || stats?.totalContacts || 0} contatos
                </span>
                {stats?.conversionRate !== undefined && (
                  <span className={styles.rate}>
                    {(stats.conversionRate * 100).toFixed(1)}% conversão
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <div className={styles.actions}>
          {/* Stage actions menu */}
        </div>
      </div>

      <div ref={setNodeRef} className={styles.contacts}>
        {isLoading ? (
          <div className={styles.emptyState}>
            <LoadingState message="" fullHeight={false} />
          </div>
        ) : contactIds.length === 0 ? (
          <div className={styles.emptyState}>
            <p className="text-sm text-neutral-500">Arraste contatos aqui</p>
          </div>
        ) : (
          <SortableContext items={contactIds.map(id => `contact-${id}`)} strategy={verticalListSortingStrategy}>
            {contactIds.map(contactId => (
              <PipelineContact
                key={contactId}
                contactId={contactId}
                stageId={stage.id}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
};

export default PipelineStageColumn;
