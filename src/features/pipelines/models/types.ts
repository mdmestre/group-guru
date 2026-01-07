/**
 * CRM Pipeline Types & Interfaces
 */

export interface Pipeline {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  stageOrder: string[];
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  position: number;
  color?: string;
  description?: string;
  conversionProbability: number;
  isDefault: boolean;
  contactIds?: string[]; // Contacts currently in this stage
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineHistory {
  id: string;
  contactId: string;
  pipelineId: string;
  fromStageId?: string;
  toStageId: string;
  companyId: string;
  movedBy: string;
  notes?: string;
  createdAt: Date;
}

export interface CreatePipelineInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdatePipelineInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface CreatePipelineStageInput {
  name: string;
  position: number;
  color?: string;
  description?: string;
  conversionProbability?: number;
  isDefault?: boolean;
}

export interface MoveContactInPipelineInput {
  contactId: string;
  fromStageId?: string;
  toStageId: string;
  notes?: string;
}
