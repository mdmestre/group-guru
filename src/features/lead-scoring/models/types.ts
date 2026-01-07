/**
 * CRM Lead Scoring Types & Interfaces
 */

export interface LeadScore {
  id: string;
  contactId: string;
  companyId: string;
  totalScore: number;
  engagementScore: number;
  interactionCount: number;
  lastInteractionAt?: Date;
  scoreBreakdown: Record<string, number>;
  previousScores: ScoreHistory[];
  updatedAt: Date;
  createdAt: Date;
}

export interface ScoreHistory {
  score: number;
  breakdown: Record<string, number>;
  timestamp: Date;
}

export interface LeadScoringRule {
  id: string;
  companyId: string;
  name: string;
  ruleType: 'interaction' | 'field_value' | 'engagement' | 'custom';
  condition: ScoringCondition;
  points: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoringCondition {
  field?: string;
  operator?: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in';
  value?: any;
  eventType?: string; // For interaction rules
}

export interface CreateLeadScoringRuleInput {
  name: string;
  ruleType: 'interaction' | 'field_value' | 'engagement' | 'custom';
  condition: ScoringCondition;
  points: number;
}

export interface LeadScoreCalculationResult {
  totalScore: number;
  engagement: number;
  breakdown: Record<string, { points: number; reason: string }>;
  highestScoringAreas: string[];
}

// Scoring Criteria
export interface ScoringCriteria {
  emailOpen: number; // Points per email open
  emailClick: number; // Points per email click
  pageView: number; // Points per page view
  downloadResource: number; // Points per resource download
  callMade: number; // Points per call
  meetingScheduled: number; // Points per meeting
  dealCreated: number; // Points per deal
  customFieldMatch: Record<string, number>; // Custom field value scoring
}
