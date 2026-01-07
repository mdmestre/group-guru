/**
 * Socket.IO Event Emitter Helper
 * Centraliza a emissão de eventos Socket.IO para o backend
 * 
 * Este arquivo é apenas para referência - a implementação real
 * deve ser feita no backend (server.js ou services)
 */

/**
 * Eventos de Pipeline
 */
export const PipelineEvents = {
  UPDATED: 'pipeline:updated',
  STAGE_UPDATED: 'pipeline:stage_updated',
  CONTACT_MOVED: 'pipeline:contact_moved',
  CREATED: 'pipeline:created',
  DELETED: 'pipeline:deleted',
} as const;

/**
 * Eventos de Lead Scoring
 */
export const LeadScoringEvents = {
  SCORE_UPDATED: 'lead-scoring:score_updated',
  RULE_UPDATED: 'lead-scoring:rule_updated',
  RULE_CREATED: 'lead-scoring:rule_created',
  RULE_DELETED: 'lead-scoring:rule_deleted',
  SCORES_RECALCULATED: 'lead-scoring:scores_recalculated',
} as const;

/**
 * Eventos de Segments
 */
export const SegmentEvents = {
  UPDATED: 'segment:updated',
  CREATED: 'segment:created',
  DELETED: 'segment:deleted',
  MEMBERS_REFRESHED: 'segment:members_refreshed',
} as const;

/**
 * Eventos de Custom Fields
 */
export const CustomFieldEvents = {
  UPDATED: 'custom-field:updated',
  CREATED: 'custom-field:created',
  DELETED: 'custom-field:deleted',
  VALUE_UPDATED: 'custom-field:value_updated',
} as const;

/**
 * Tipos de dados para eventos
 */
export interface PipelineUpdatedEvent {
  pipelineId: string;
  companyId?: string;
}

export interface StageUpdatedEvent {
  pipelineId: string;
  stageId?: string;
  companyId?: string;
}

export interface ContactMovedEvent {
  pipelineId: string;
  contactId: string;
  stageId: string;
  fromStageId?: string;
  companyId?: string;
}

export interface ScoreUpdatedEvent {
  contactId: string;
  score: number;
  previousScore?: number;
  companyId?: string;
}

export interface RuleUpdatedEvent {
  ruleId?: string;
  companyId?: string;
}

export interface SegmentUpdatedEvent {
  segmentId: string;
  memberCount?: number;
  companyId?: string;
}

export interface CustomFieldUpdatedEvent {
  fieldId?: string;
  companyId?: string;
}

export interface CustomFieldValueUpdatedEvent {
  contactId: string;
  fieldId?: string;
  companyId?: string;
}

