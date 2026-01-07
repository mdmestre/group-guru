/**
 * CRM Segments Types & Interfaces
 */

export interface Segment {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  criteria: SegmentCriteria;
  filterLogic: 'AND' | 'OR';
  memberCount: number;
  isActive: boolean;
  isSmart: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastRefreshedAt?: Date;
  createdBy: string;
}

export interface SegmentCriteria {
  rules: SegmentRule[];
}

export interface SegmentRule {
  field: string; // Custom field ID or standard field (email, phone, tags, etc)
  operator: SegmentOperator;
  value: any;
  fieldType?: string;
}

export type SegmentOperator = 
  | 'equals' 
  | 'notEquals' 
  | 'contains' 
  | 'notContains' 
  | 'greaterThan' 
  | 'lessThan' 
  | 'greaterOrEqual' 
  | 'lessOrEqual' 
  | 'in' 
  | 'notIn' 
  | 'startsWith' 
  | 'endsWith' 
  | 'isEmpty' 
  | 'isNotEmpty' 
  | 'inRange';

export interface SegmentMember {
  id: string;
  segmentId: string;
  contactId: string;
  companyId: string;
  addedAt: Date;
}

export interface SegmentAction {
  id: string;
  segmentId: string;
  companyId: string;
  actionType: 'tag' | 'email' | 'sms' | 'update_field' | 'add_to_pipeline';
  actionData: Record<string, any>;
  executedAt?: Date;
  executedBy?: string;
  createdAt: Date;
}

export interface CreateSegmentInput {
  name: string;
  description?: string;
  criteria: SegmentCriteria;
  filterLogic?: 'AND' | 'OR';
}

export interface UpdateSegmentInput {
  name?: string;
  description?: string;
  criteria?: SegmentCriteria;
  filterLogic?: 'AND' | 'OR';
  isActive?: boolean;
}

export interface EvaluateSegmentInput {
  segmentCriteria: SegmentCriteria;
  filterLogic: 'AND' | 'OR';
  companyId: string;
}

export interface SegmentEvaluationResult {
  contactIds: string[];
  count: number;
  estimatedReach: string; // percentage
}
