/**
 * Pipedrive CRM Types
 * Modelo de dados completo baseado no Pipedrive
 */

// ============================================
// DEALS (Negócios)
// ============================================

export type DealStatus = "open" | "won" | "lost";
export type DealCurrency = "BRL" | "USD" | "EUR";

// ============================================
// DEAL TIMELINE (Histórico de mudanças)
// ============================================

export type DealTimelineEventType = 
  | "created"
  | "stage_changed"
  | "value_changed"
  | "owner_changed"
  | "status_changed"
  | "person_linked"
  | "organization_linked"
  | "note_added"
  | "activity_added"
  | "activity_completed"
  | "tag_added"
  | "custom_field_changed";

export interface DealTimelineEvent {
  id: string;
  dealId: string;
  type: DealTimelineEventType;
  userId: string; // Quem fez a ação
  timestamp: Date;
  description: string;
  metadata?: {
    oldValue?: any;
    newValue?: any;
    oldStageId?: string;
    newStageId?: string;
    oldOwnerId?: string;
    newOwnerId?: string;
    oldStatus?: DealStatus;
    newStatus?: DealStatus;
    activityId?: string;
    note?: string;
    [key: string]: any;
  };
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: DealCurrency;
  stageId: string; // ID da etapa do funil
  personId?: string; // ID da pessoa de contato
  organizationId?: string; // ID da organização/empresa
  ownerId: string; // ID do responsável
  status: DealStatus;
  probability?: number; // 0-100
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  // Timeline e relacionamentos
  timeline?: DealTimelineEvent[]; // Histórico de mudanças
  lastActivityDate?: Date; // Última atividade relacionada
  daysInCurrentStage?: number; // Dias na etapa atual
}

// ============================================
// PIPELINE & STAGES (Funil e Etapas)
// ============================================

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number; // 0-100
  color: string;
  pipelineId: string;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  isDefault: boolean;
  createdAt: Date;
}

// ============================================
// PERSONS (Pessoas/Contatos)
// ============================================

export interface Person {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organizationId?: string;
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

// ============================================
// ORGANIZATIONS (Organizações/Empresas)
// ============================================

export interface Organization {
  id: string;
  name: string;
  ownerId?: string;
  address?: string;
  website?: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

// ============================================
// ACTIVITIES (Atividades)
// ============================================

export type ActivityType = "call" | "meeting" | "email" | "task" | "note";
export type ActivityStatus = "open" | "done" | "overdue";

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  note?: string;
  dealId?: string;
  personId?: string;
  organizationId?: string;
  ownerId: string;
  dueDate?: Date;
  dueTime?: string;
  duration?: number; // minutos
  status: ActivityStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// USERS (Usuários/Equipe)
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "user" | "viewer";
  isActive: boolean;
}

// ============================================
// GOALS (Metas)
// ============================================

export type GoalType = "deals_won" | "deals_value" | "activities_completed";
export type GoalPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface Goal {
  id: string;
  type: GoalType;
  period: GoalPeriod;
  target: number;
  userId?: string; // Meta individual
  teamId?: string; // Meta de equipe
  startDate: Date;
  endDate: Date;
  currentValue: number;
  createdAt: Date;
}

// ============================================
// AUTOMATION RULES
// ============================================

export type AutomationTriggerType = 
  | "deal_stage_changed"
  | "deal_created"
  | "deal_won"
  | "deal_lost"
  | "activity_created"
  | "activity_completed"
  | "days_in_stage";

export interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    type: AutomationTriggerType;
    config: Record<string, any>;
  };
  actions: Array<{
    type: "create_activity" | "assign_owner" | "change_stage" | "send_notification";
    config: Record<string, any>;
  }>;
  isActive: boolean;
  createdAt: Date;
}

// ============================================
// STATS & REPORTS
// ============================================

export interface PipelineStats {
  stageId: string;
  stageName: string;
  dealCount: number;
  totalValue: number;
  averageValue: number;
  weightedValue: number; // valor * probabilidade
  conversionRate: number; // % de conversão para próxima etapa
}

export interface UserPerformance {
  userId: string;
  userName: string;
  dealsWon: number;
  dealsWonValue: number;
  dealsOpen: number;
  dealsOpenValue: number;
  activitiesCompleted: number;
  activitiesPending: number;
  goalProgress: number; // % da meta
}

export interface FunnelReport {
  pipelineId: string;
  pipelineName: string;
  stages: PipelineStats[];
  totalDeals: number;
  totalValue: number;
  conversionRate: number;
  averageDealValue: number;
  averageDaysInPipeline: number;
}

