/**
 * Segments Service
 * Handles contact segmentation and segment management
 */

import { logger } from '@/utils/logger';
import type {
  Segment,
  CreateSegmentInput,
  UpdateSegmentInput,
  EvaluateSegmentInput,
  SegmentEvaluationResult,
  SegmentMember
} from '../models/segments';

export class SegmentService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Create segment
   */
  async createSegment(
    companyId: string,
    userId: string,
    input: CreateSegmentInput
  ): Promise<Segment> {
    try {
      const query = `
        INSERT INTO crm_segments (
          company_id, name, description, criteria, 
          filter_logic, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;

      const result = await this.db.query(query, [
        companyId,
        input.name,
        input.description || null,
        JSON.stringify(input.criteria),
        input.filterLogic || 'AND',
        userId
      ]);

      // Evaluate segment to get member count
      const segment = result.rows[0];
      const evalResult = await this.evaluateSegment({
        segmentCriteria: input.criteria,
        filterLogic: input.filterLogic || 'AND',
        companyId
      });

      // Cache members
      await this.refreshSegmentMembers(segment.id, evalResult.contactIds);

       logger.logInfo('Segment created', {
         segmentId: segment.id,
         companyId,
         name: input.name,
         memberCount: evalResult.count
       });

       const created = await this.getSegmentById(segment.id);
       if (!created) throw new Error('Failed to fetch created segment');
       return created;
    } catch (error) {
      logger.logError('Error creating segment', error as Error, { companyId });
      throw new Error('Failed to create segment');
    }
  }

  /**
   * Get all segments for company
   */
  async getSegments(
    companyId: string,
    filters?: { isActive?: boolean; isSmart?: boolean }
  ): Promise<Segment[]> {
    try {
      let query = `SELECT * FROM crm_segments WHERE company_id = $1`;
      const params: any[] = [companyId];

      if (filters?.isActive !== undefined) {
        query += ` AND is_active = $${params.length + 1}`;
        params.push(filters.isActive);
      }

      if (filters?.isSmart !== undefined) {
        query += ` AND is_smart = $${params.length + 1}`;
        params.push(filters.isSmart);
      }

      query += ` ORDER BY created_at DESC;`;

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.logError('Error fetching segments', error as Error, { companyId });
      throw new Error('Failed to fetch segments');
    }
  }

  /**
   * Get segment by ID
   */
  async getSegmentById(segmentId: string): Promise<Segment | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM crm_segments WHERE id = $1;`,
        [segmentId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.logError('Error fetching segment', error as Error, { segmentId });
      throw new Error('Failed to fetch segment');
    }
  }

  /**
   * Update segment
   */
  async updateSegment(
    segmentId: string,
    input: UpdateSegmentInput
  ): Promise<Segment> {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(input.description);
      }
      if (input.criteria !== undefined) {
        updates.push(`criteria = $${paramIndex++}`);
        params.push(JSON.stringify(input.criteria));
      }
      if (input.filterLogic !== undefined) {
        updates.push(`filter_logic = $${paramIndex++}`);
        params.push(input.filterLogic);
      }
      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(input.isActive);
      }

      if (updates.length === 0) {
        return this.getSegmentById(segmentId) as Promise<Segment>;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(segmentId);

      const query = `
        UPDATE crm_segments 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *;
      `;

      const result = await this.db.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.logError('Error updating segment', error as Error, { segmentId });
      throw new Error('Failed to update segment');
    }
  }

  /**
   * Delete segment
   */
  async deleteSegment(segmentId: string): Promise<boolean> {
    try {
      // Delete members first
      await this.db.query(
        `DELETE FROM crm_segment_members WHERE segment_id = $1;`,
        [segmentId]
      );

      // Delete segment
      const result = await this.db.query(
        `DELETE FROM crm_segments WHERE id = $1;`,
        [segmentId]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.logError('Error deleting segment', error as Error, { segmentId });
      throw new Error('Failed to delete segment');
    }
  }

  /**
   * Evaluate segment criteria to find matching contacts
   */
  async evaluateSegment(input: EvaluateSegmentInput): Promise<SegmentEvaluationResult> {
    try {
      const { segmentCriteria, filterLogic, companyId } = input;
      const rules = segmentCriteria.rules;

      let contactIds: string[] = [];

      if (rules.length === 0) {
        // No rules = all contacts
        const result = await this.db.query(
          `SELECT id FROM crm_contacts WHERE company_id = $1;`,
          [companyId]
        );
        contactIds = result.rows.map(r => r.id);
      } else {
        // Build query based on rules
        const whereConditions = await Promise.all(
          rules.map((rule, idx) => this.buildRuleCondition(rule, idx, companyId))
        );

        const operator = filterLogic === 'OR' ? 'OR' : 'AND';
        const whereClause = whereConditions.join(` ${operator} `);

        const query = `
          SELECT DISTINCT c.id FROM crm_contacts c
          LEFT JOIN crm_custom_field_values cfv ON c.id = cfv.contact_id
          WHERE c.company_id = $1 AND (${whereClause});
        `;

        const result = await this.db.query(query, [companyId]);
        contactIds = result.rows.map(r => r.id);
      }

      const totalContacts = await this.db.query(
        `SELECT COUNT(*) as count FROM crm_contacts WHERE company_id = $1;`,
        [companyId]
      );

      const reach = totalContacts.rows[0].count > 0 
        ? ((contactIds.length / totalContacts.rows[0].count) * 100).toFixed(1) + '%'
        : '0%';

      return {
        contactIds,
        count: contactIds.length,
        estimatedReach: reach
      };
    } catch (error) {
      logger.logError('Error evaluating segment', error as Error);
      throw new Error('Failed to evaluate segment');
    }
  }

  /**
   * Build SQL condition for a rule
   */
  private async buildRuleCondition(rule: any, index: number, companyId: string): Promise<string> {
    const { field, operator, value } = rule;

    // Handle standard fields vs custom fields
    if (['email', 'phone', 'name', 'tags'].includes(field)) {
      return this.buildStandardFieldCondition(field, operator, value);
    }

    // Custom field condition
    return `(cfv.custom_field_id = '${field}' AND ${this.buildOperatorCondition('cfv.value', operator, value)})`;
  }

  /**
   * Build condition for standard fields
   */
  private buildStandardFieldCondition(field: string, operator: string, value: any): string {
    return `${this.buildOperatorCondition(`c.${field}`, operator, value)}`;
  }

  /**
   * Build operator-specific condition
   */
  private buildOperatorCondition(fieldName: string, operator: string, value: any): string {
    switch (operator) {
      case 'equals':
        return `${fieldName} = '${value}'`;
      case 'notEquals':
        return `${fieldName} != '${value}'`;
      case 'contains':
        return `${fieldName} ILIKE '%${value}%'`;
      case 'notContains':
        return `${fieldName} NOT ILIKE '%${value}%'`;
      case 'startsWith':
        return `${fieldName} ILIKE '${value}%'`;
      case 'endsWith':
        return `${fieldName} ILIKE '%${value}'`;
      case 'greaterThan':
        return `${fieldName}::numeric > ${value}`;
      case 'lessThan':
        return `${fieldName}::numeric < ${value}`;
      case 'greaterOrEqual':
        return `${fieldName}::numeric >= ${value}`;
      case 'lessOrEqual':
        return `${fieldName}::numeric <= ${value}`;
      case 'in':
        const vals = Array.isArray(value) ? value.map(v => `'${v}'`).join(',') : `'${value}'`;
        return `${fieldName} IN (${vals})`;
      case 'notIn':
        const notVals = Array.isArray(value) ? value.map(v => `'${v}'`).join(',') : `'${value}'`;
        return `${fieldName} NOT IN (${notVals})`;
      case 'isEmpty':
        return `${fieldName} IS NULL OR ${fieldName} = ''`;
      case 'isNotEmpty':
        return `${fieldName} IS NOT NULL AND ${fieldName} != ''`;
      default:
        return `${fieldName} = '${value}'`;
    }
  }

  /**
   * Refresh segment members (cache)
   */
  async refreshSegmentMembers(
    segmentId: string,
    contactIds: string[]
  ): Promise<{ added: number }> {
    try {
      // Clear existing members
      await this.db.query(
        `DELETE FROM crm_segment_members WHERE segment_id = $1;`,
        [segmentId]
      );

      if (contactIds.length === 0) {
        return { added: 0 };
      }

      // Get segment to find company ID
      const segment = await this.getSegmentById(segmentId);
      if (!segment) throw new Error('Segment not found');

      // Insert new members
      const query = `
        INSERT INTO crm_segment_members (segment_id, contact_id, company_id)
        SELECT $1, unnest($2::uuid[]), $3;
      `;

      const result = await this.db.query(query, [
        segmentId,
        contactIds,
        segment.companyId
      ]);

      // Update member count
      await this.db.query(
        `UPDATE crm_segments SET member_count = $1, last_refreshed_at = CURRENT_TIMESTAMP WHERE id = $2;`,
        [contactIds.length, segmentId]
      );

      return { added: result.rowCount };
    } catch (error) {
      logger.logError('Error refreshing segment members', error as Error, { segmentId });
      throw new Error('Failed to refresh segment members');
    }
  }

  /**
   * Get segment members
   */
  async getSegmentMembers(
    segmentId: string,
    limit = 100,
    offset = 0
  ): Promise<{ members: SegmentMember[]; total: number }> {
    try {
      const [membersResult, countResult] = await Promise.all([
        this.db.query(
          `
            SELECT * FROM crm_segment_members 
            WHERE segment_id = $1 
            ORDER BY added_at DESC 
            LIMIT $2 OFFSET $3;
          `,
          [segmentId, limit, offset]
        ),
        this.db.query(
          `SELECT COUNT(*) as count FROM crm_segment_members WHERE segment_id = $1;`,
          [segmentId]
        )
      ]);

      return {
        members: membersResult.rows,
        total: parseInt(countResult.rows[0].count)
      };
    } catch (error) {
      logger.logError('Error fetching segment members', error as Error, { segmentId });
      throw new Error('Failed to fetch segment members');
    }
  }
}
