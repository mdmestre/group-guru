/**
 * Automation Types & Interfaces
 * Phase 3: Intelligent Automations
 */

// ==================== Flow Definition Types ====================

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ==================== Node Types ====================

export type NodeType = 
  | 'trigger'
  | 'action'
  | 'condition'
  | 'delay'
  | 'split'
  | 'ai-response'
  | 'webhook';

export type TriggerType =
  | 'message_received'
  | 'contact_created'
  | 'field_changed'
  | 'tag_added'
  | 'stage_changed'
  | 'webhook'
  | 'schedule'
  | 'manual_trigger';

export type ActionType =
  | 'send_message'
  | 'create_task'
  | 'update_field'
  | 'add_tag'
  | 'remove_tag'
  | 'change_stage'
  | 'send_email'
  | 'call_webhook'
  | 'ai_response'
  | 'wait'
  | 'split_path';

export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in';

// ==================== Node Data Types ====================

export interface TriggerNodeData {
  triggerType: TriggerType;
  config: TriggerConfig;
}

export interface TriggerConfig {
  // Message received
  keywords?: string[];
  fromContact?: string;
  fromGroup?: string;
  
  // Contact created
  source?: string;
  
  // Field changed
  fieldId?: string;
  fieldValue?: any;
  
  // Tag added
  tagId?: string;
  
  // Stage changed
  fromStageId?: string;
  toStageId?: string;
  
  // Schedule
  schedule?: ScheduleConfig;
  
  // Webhook
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST';
}

export interface ScheduleConfig {
  timezone?: string;
  cron?: string;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  timeRange?: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
  blackoutDates?: string[]; // ISO dates
}

export interface ActionNodeData {
  actionType: ActionType;
  config: ActionConfig;
}

export interface ActionConfig {
  // Send message
  message?: string;
  templateId?: string;
  variables?: Record<string, string>;
  
  // Create task
  taskTitle?: string;
  taskDescription?: string;
  assignTo?: string;
  dueDate?: string;
  
  // Update field
  fieldId?: string;
  fieldValue?: any;
  
  // Tag operations
  tagId?: string;
  tagIds?: string[];
  
  // Change stage
  stageId?: string;
  pipelineId?: string;
  
  // Send email
  emailTo?: string;
  emailSubject?: string;
  emailBody?: string;
  
  // Webhook
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  webhookHeaders?: Record<string, string>;
  webhookBody?: any;
  
  // AI Response
  aiPrompt?: string;
  aiModel?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3';
  aiTemperature?: number;
  aiMaxTokens?: number;
  
  // Wait/Delay
  delaySeconds?: number;
  delayUntil?: string; // ISO date
  delayUntilTime?: string; // HH:mm
}

export interface ConditionNodeData {
  conditions: Condition[];
  logic: 'AND' | 'OR';
}

export interface Condition {
  field: string; // Field ID or variable name
  operator: ConditionOperator;
  value: any;
}

export interface DelayNodeData {
  delayType: 'seconds' | 'minutes' | 'hours' | 'days' | 'until';
  delayValue?: number;
  delayUntil?: string; // ISO date
  delayUntilTime?: string; // HH:mm
  timezone?: string;
}

export interface SplitNodeData {
  paths: SplitPath[];
}

export interface SplitPath {
  id: string;
  condition?: Condition;
  label: string;
}

export interface AIResponseNodeData {
  prompt: string;
  model?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  contextVariables?: string[]; // Variable names to include in context
}

export type NodeData = 
  | TriggerNodeData
  | ActionNodeData
  | ConditionNodeData
  | DelayNodeData
  | SplitNodeData
  | AIResponseNodeData;

// ==================== Automation Entity Types ====================

export interface Automation {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  version: number;
  flowDefinition: FlowDefinition;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  isActive: boolean;
  isPaused: boolean;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  companyId: string;
  automationVersion: number;
  contactId?: string;
  triggerData: Record<string, any>;
  executionContext: Record<string, any>;
  lockKey?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled' | 'retrying' | 'delayed';
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  delayUntil?: Date;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationLog {
  id: string;
  runId: string;
  companyId: string;
  nodeId: string;
  nodeType: NodeType;
  actionType?: ActionType;
  status: 'success' | 'failed' | 'skipped' | 'pending';
  inputSnapshot: Record<string, any>;
  outputSnapshot: Record<string, any>;
  errorMessage?: string;
  executedAt: Date;
  durationMs?: number;
}

// ==================== Input/Output Types ====================

export interface CreateAutomationInput {
  name: string;
  description?: string;
  flowDefinition: FlowDefinition;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  isActive?: boolean;
}

export interface UpdateAutomationInput {
  name?: string;
  description?: string;
  flowDefinition?: FlowDefinition;
  triggerType?: TriggerType;
  triggerConfig?: TriggerConfig;
  isActive?: boolean;
  isPaused?: boolean;
}

export interface TestAutomationInput {
  automationId: string;
  contactId?: string;
  triggerData?: Record<string, any>;
  dryRun?: boolean;
}

export interface AutomationTestResult {
  success: boolean;
  executedNodes: string[];
  skippedNodes: string[];
  errors: Array<{
    nodeId: string;
    error: string;
  }>;
  finalContext: Record<string, any>;
}

// ==================== AI Integration Types ====================

export interface AIResponse {
  text: string;
  confidence?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  intent?: string;
  suggestedActions?: string[];
}

export interface AIConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

