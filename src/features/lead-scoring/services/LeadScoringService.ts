/**
 * Lead Scoring Service
 * Handles lead score calculation and management
 */

import { logger } from '@/utils/logger';
import type {
  LeadScore,
  LeadScoringRule,
  LeadScoreCalculationResult,
  ScoringCriteria,
  CreateLeadScoringRuleInput
} from '../models/types';

export class LeadScoringService {
  private db: any; // PostgreSQL client
  private defaultCriteria: ScoringCriteria = {
    emailOpen: 5,
    emailClick: 10,
    pageView: 2,
    downloadResource: 15,
    callMade: 20,
    meetingScheduled: 25,
    dealCreated: 50,
    customFieldMatch: {}
  };

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Calculate lead score for a contact
   */
  async calculateLeadScore(
    contactId: string,
    companyId: string
  ): Promise<LeadScoreCalculationResult> {
    try {
      const rules = await this.getActiveRules(companyId);
      const contact = await this.db.query(
        `SELECT * FROM crm_contacts WHERE id = $1 AND company_id = $2;`,
        [contactId, companyId]
      );

      if (contact.rows.length === 0) {
        throw new Error('Contact not found');
      }

      let totalScore = 0;
      let engagementScore = 0;
      const breakdown: Record<string, { points: number; reason: string }> = {};

      // Apply rules
      for (const rule of rules) {
        const matched = await this.evaluateRule(rule, contact.rows[0]);
        if (matched) {
          totalScore += rule.points;
          if (rule.rule_type === 'interaction') {
            engagementScore += rule.points;
          }
          breakdown[rule.name] = {
            points: rule.points,
            reason: `Matched: ${rule.name}`
          };
        }
      }

      // Get interaction count
      const interactions = await this.db.query(
        `
          SELECT COUNT(*) as count FROM contact_interactions 
          WHERE contact_id = $1;
        `,
        [contactId]
      );

      const interactionCount = parseInt(interactions.rows[0].count);
      const lastInteraction = await this.db.query(
        `
          SELECT created_at FROM contact_interactions 
          WHERE contact_id = $1 
          ORDER BY created_at DESC LIMIT 1;
        `,
        [contactId]
      );

      // Get previous scores for history
      const previousScores = await this.db.query(
        `
          SELECT score_breakdown, total_score, updated_at 
          FROM crm_lead_scores 
          WHERE contact_id = $1 
          ORDER BY updated_at DESC LIMIT 10;
        `,
        [contactId]
      );

      const highestScoringAreas = Object.entries(breakdown)
        .sort(([, a], [, b]) => b.points - a.points)
        .slice(0, 3)
        .map(([name]) => name);

      return {
        totalScore,
        engagement: engagementScore,
        breakdown,
        highestScoringAreas
      };
    } catch (error) {
      logger.logError('Error calculating lead score', error as Error, { contactId });
      throw error;
    }
  }

  /**
   * Evaluate a single rule against contact data
   */
  private async evaluateRule(rule: any, contact: any): Promise<boolean> {
    try {
      const { rule_type, condition } = rule;

      switch (rule_type) {
        case 'interaction':
          return await this.evaluateInteractionRule(contact, condition);
        case 'field_value':
          return this.evaluateFieldRule(contact, condition);
        case 'engagement':
          return await this.evaluateEngagementRule(contact, condition);
        default:
          return false;
      }
    } catch (error) {
      logger.logWarning('Error evaluating rule', { rule: rule.id });
      return false;
    }
  }

  /**
   * Evaluate interaction-based rule
   */
  private async evaluateInteractionRule(
    contact: any,
    condition: any
  ): Promise<boolean> {
    const { eventType, value } = condition;
    const result = await this.db.query(
      `
        SELECT COUNT(*) as count FROM contact_interactions 
        WHERE contact_id = $1 AND type = $2;
      `,
      [contact.id, eventType]
    );

    return parseInt(result.rows[0].count) >= (value || 1);
  }

  /**
   * Evaluate field-based rule
   */
  private evaluateFieldRule(contact: any, condition: any): boolean {
    const { field, operator, value } = condition;
    const contactValue = contact[field];

    switch (operator) {
      case 'equals':
        return contactValue === value;
      case 'contains':
        return String(contactValue).includes(String(value));
      case 'greaterThan':
        return Number(contactValue) > Number(value);
      case 'lessThan':
        return Number(contactValue) < Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(contactValue);
      default:
        return false;
    }
  }

  /**
   * Evaluate engagement-based rule
   */
  private async evaluateEngagementRule(
    contact: any,
    condition: any
  ): Promise<boolean> {
    const { metric, threshold } = condition;
    const result = await this.db.query(
      `
        SELECT COUNT(*) as count FROM contact_interactions 
        WHERE contact_id = $1 
        AND created_at > NOW() - INTERVAL '30 days';
      `,
      [contact.id]
    );

    const recentInteractions = parseInt(result.rows[0].count);
    return recentInteractions >= threshold;
  }

  /**
   * Get active scoring rules for company
   */
  async getActiveRules(companyId: string): Promise<LeadScoringRule[]> {
    try {
      const result = await this.db.query(
        `
          SELECT * FROM crm_lead_scoring_rules 
          WHERE company_id = $1 AND is_active = true 
          ORDER BY points DESC;
        `,
        [companyId]
      );
      return result.rows;
    } catch (error) {
      logger.logError('Error fetching scoring rules', error as Error, { companyId });
      throw new Error('Failed to fetch scoring rules');
    }
  }

  /**
   * Create a custom scoring rule
   */
  async createScoringRule(
    companyId: string,
    input: CreateLeadScoringRuleInput
  ): Promise<LeadScoringRule> {
    try {
      const query = `
        INSERT INTO crm_lead_scoring_rules (
          company_id, name, rule_type, condition, points
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;

      const result = await this.db.query(query, [
        companyId,
        input.name,
        input.ruleType,
        JSON.stringify(input.condition),
        input.points
      ]);

      logger.logInfo('Scoring rule created', { 
        ruleId: result.rows[0].id,
        companyId 
      });

      return result.rows[0];
    } catch (error) {
      logger.logError('Error creating scoring rule', error as Error, { companyId });
      throw new Error('Failed to create scoring rule');
    }
  }

  /**
   * Get lead score for contact
   */
  async getLeadScore(contactId: string): Promise<LeadScore | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM crm_lead_scores WHERE contact_id = $1;`,
        [contactId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.logError('Error fetching lead score', error as Error, { contactId });
      throw new Error('Failed to fetch lead score');
    }
  }

  /**
   * Update lead score in database
   */
  async updateLeadScore(
    contactId: string,
    companyId: string,
    score: LeadScoreCalculationResult
  ): Promise<LeadScore> {
    try {
      // Get previous score
      const previous = await this.getLeadScore(contactId);

      // Build previous scores history
      const previousScores = previous?.previous_scores || [];
      if (previous) {
        previousScores.unshift({
          score: previous.total_score,
          breakdown: previous.score_breakdown,
          timestamp: previous.updated_at
        });
      }

      const query = `
        INSERT INTO crm_lead_scores (
          contact_id, company_id, total_score, engagement_score, 
          score_breakdown, previous_scores
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (contact_id) DO UPDATE SET
          total_score = EXCLUDED.total_score,
          engagement_score = EXCLUDED.engagement_score,
          score_breakdown = EXCLUDED.score_breakdown,
          previous_scores = EXCLUDED.previous_scores,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const result = await this.db.query(query, [
        contactId,
        companyId,
        score.totalScore,
        score.engagement,
        JSON.stringify(score.breakdown),
        JSON.stringify(previousScores.slice(0, 10)) // Keep last 10
      ]);

      return result.rows[0];
    } catch (error) {
      logger.logError('Error updating lead score', error as Error, { contactId });
      throw new Error('Failed to update lead score');
    }
  }

  /**
   * Get leads by score range
   */
  async getLeadsByScoreRange(
    companyId: string,
    minScore: number,
    maxScore: number,
    limit = 50
  ): Promise<LeadScore[]> {
    try {
      const result = await this.db.query(
        `
          SELECT * FROM crm_lead_scores 
          WHERE company_id = $1 
          AND total_score BETWEEN $2 AND $3 
          ORDER BY total_score DESC 
          LIMIT $4;
        `,
        [companyId, minScore, maxScore, limit]
      );
      return result.rows;
    } catch (error) {
      logger.logError('Error fetching leads by score', error as Error, { companyId });
      throw new Error('Failed to fetch leads by score');
    }
  }

  /**
   * Batch recalculate scores for all contacts
   */
  async recalculateAllScores(companyId: string): Promise<{ processed: number }> {
    try {
      const contacts = await this.db.query(
        `SELECT id FROM crm_contacts WHERE company_id = $1;`,
        [companyId]
      );

      let processed = 0;
      for (const contact of contacts.rows) {
        try {
          const score = await this.calculateLeadScore(contact.id, companyId);
          await this.updateLeadScore(contact.id, companyId, score);
          processed++;
        } catch (error) {
          logger.logWarning('Failed to recalculate score for contact', {
            contactId: contact.id
          });
        }
      }

      logger.logInfo('Lead scores recalculated', { companyId, processed });
      return { processed };
    } catch (error) {
      logger.logError('Error recalculating scores', error as Error, { companyId });
      throw new Error('Failed to recalculate scores');
    }
  }
}
