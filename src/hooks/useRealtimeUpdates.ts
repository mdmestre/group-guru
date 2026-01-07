/**
 * Hook para Real-time Updates via Socket.IO
 * Integra eventos Socket.IO com React Query para atualizações automáticas
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/contexts/SocketProvider';
import { pipelineKeys } from '@/features/pipelines/hooks/usePipelines';
import { leadScoringKeys } from '@/features/lead-scoring/hooks/useLeadScoring';
import { segmentKeys } from '@/features/crm/hooks/useSegments';
import { customFieldKeys } from '@/features/crm/hooks/useCustomFields';

/**
 * Hook para escutar atualizações de Pipeline em tempo real
 */
export function usePipelineRealtime(pipelineId?: string) {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePipelineUpdated = (data: { pipelineId: string }) => {
      console.log('[Socket] Pipeline updated:', data);
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
      if (data.pipelineId) {
        queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(data.pipelineId) });
        queryClient.invalidateQueries({ queryKey: pipelineKeys.stages(data.pipelineId) });
      }
    };

    const handleStageUpdated = (data: { pipelineId: string; stageId?: string }) => {
      console.log('[Socket] Stage updated:', data);
      if (data.pipelineId) {
        queryClient.invalidateQueries({ queryKey: pipelineKeys.stages(data.pipelineId) });
        queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(data.pipelineId) });
      }
    };

    const handleContactMoved = (data: { pipelineId: string; contactId: string; stageId: string }) => {
      console.log('[Socket] Contact moved:', data);
      if (data.pipelineId) {
        queryClient.invalidateQueries({ queryKey: pipelineKeys.stages(data.pipelineId) });
        queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(data.pipelineId) });
      }
    };

    socket.on('pipeline:updated', handlePipelineUpdated);
    socket.on('pipeline:stage_updated', handleStageUpdated);
    socket.on('pipeline:contact_moved', handleContactMoved);

    return () => {
      socket.off('pipeline:updated', handlePipelineUpdated);
      socket.off('pipeline:stage_updated', handleStageUpdated);
      socket.off('pipeline:contact_moved', handleContactMoved);
    };
  }, [socket, isConnected, queryClient, pipelineId]);
}

/**
 * Hook para escutar atualizações de Lead Scoring em tempo real
 */
export function useLeadScoringRealtime() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleScoreUpdated = (data: { contactId: string; score: number }) => {
      console.log('[Socket] Lead score updated:', data);
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.score(data.contactId) });
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.leadsByScore() });
    };

    const handleRuleUpdated = (data: { ruleId?: string }) => {
      console.log('[Socket] Scoring rule updated:', data);
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.rules() });
      if (data.ruleId) {
        queryClient.invalidateQueries({ queryKey: leadScoringKeys.rule(data.ruleId) });
      }
      // Recalculate all scores when rules change
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.all });
    };

    const handleScoresRecalculated = () => {
      console.log('[Socket] All scores recalculated');
      queryClient.invalidateQueries({ queryKey: leadScoringKeys.all });
    };

    socket.on('lead-scoring:score_updated', handleScoreUpdated);
    socket.on('lead-scoring:rule_updated', handleRuleUpdated);
    socket.on('lead-scoring:scores_recalculated', handleScoresRecalculated);

    return () => {
      socket.off('lead-scoring:score_updated', handleScoreUpdated);
      socket.off('lead-scoring:rule_updated', handleRuleUpdated);
      socket.off('lead-scoring:scores_recalculated', handleScoresRecalculated);
    };
  }, [socket, isConnected, queryClient]);
}

/**
 * Hook para escutar atualizações de Segments em tempo real
 */
export function useSegmentsRealtime() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleSegmentUpdated = (data: { segmentId: string }) => {
      console.log('[Socket] Segment updated:', data);
      queryClient.invalidateQueries({ queryKey: segmentKeys.all });
      if (data.segmentId) {
        queryClient.invalidateQueries({ queryKey: segmentKeys.detail(data.segmentId) });
        queryClient.invalidateQueries({ queryKey: segmentKeys.members(data.segmentId) });
      }
    };

    const handleMembersRefreshed = (data: { segmentId: string; memberCount: number }) => {
      console.log('[Socket] Segment members refreshed:', data);
      if (data.segmentId) {
        queryClient.invalidateQueries({ queryKey: segmentKeys.members(data.segmentId) });
        queryClient.invalidateQueries({ queryKey: segmentKeys.detail(data.segmentId) });
      }
    };

    socket.on('segment:updated', handleSegmentUpdated);
    socket.on('segment:members_refreshed', handleMembersRefreshed);

    return () => {
      socket.off('segment:updated', handleSegmentUpdated);
      socket.off('segment:members_refreshed', handleMembersRefreshed);
    };
  }, [socket, isConnected, queryClient]);
}

/**
 * Hook para escutar atualizações de Custom Fields em tempo real
 */
export function useCustomFieldsRealtime() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleFieldUpdated = (data: { fieldId?: string }) => {
      console.log('[Socket] Custom field updated:', data);
      queryClient.invalidateQueries({ queryKey: customFieldKeys.all });
      if (data.fieldId) {
        queryClient.invalidateQueries({ queryKey: customFieldKeys.detail(data.fieldId) });
      }
    };

    const handleValueUpdated = (data: { contactId: string; fieldId?: string }) => {
      console.log('[Socket] Custom field value updated:', data);
      if (data.contactId) {
        queryClient.invalidateQueries({ queryKey: customFieldKeys.values(data.contactId) });
      }
      if (data.fieldId) {
        queryClient.invalidateQueries({ queryKey: customFieldKeys.detail(data.fieldId) });
      }
    };

    socket.on('custom-field:updated', handleFieldUpdated);
    socket.on('custom-field:value_updated', handleValueUpdated);

    return () => {
      socket.off('custom-field:updated', handleFieldUpdated);
      socket.off('custom-field:value_updated', handleValueUpdated);
    };
  }, [socket, isConnected, queryClient]);
}

/**
 * Hook master que escuta todos os eventos de CRM em tempo real
 */
export function useCRMRealtime() {
  usePipelineRealtime();
  useLeadScoringRealtime();
  useSegmentsRealtime();
  useCustomFieldsRealtime();
}

