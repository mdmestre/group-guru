/**
 * Pipeline Service
 * Handles all pipeline and stage operations
 */

import { logger } from '@/utils/logger';
import type { 
  Pipeline, 
  PipelineStage, 
  PipelineHistory, 
  CreatePipelineInput,
  UpdatePipelineInput,
  CreatePipelineStageInput,
  MoveContactInPipelineInput 
} from '../models/types';

export class PipelineService {
  private db: any; // PostgreSQL client
  
  constructor(db: any) {
    this.db = db;
  }

  /**
   * Create a new pipeline
   */
  async createPipeline(
    companyId: string,
    userId: string,
    input: CreatePipelineInput
  ): Promise<Pipeline> {
    try {
      const query = `
        INSERT INTO crm_pipelines (company_id, name, description, color, icon, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      
      const result = await this.db.query(query, [
        companyId,
        input.name,
        input.description || null,
        input.color || null,
        input.icon || null,
        userId
      ]);

      logger.logInfo('Pipeline created', {
        pipelineId: result.rows[0].id,
        companyId,
        name: input.name
      });

      return result.rows[0];
    } catch (error) {
      logger.logError('Error creating pipeline', error as Error, { companyId });
      throw new Error('Failed to create pipeline');
    }
  }

  /**
   * Get all pipelines for company
   */
  async getPipelines(companyId: string, filters?: {
    isActive?: boolean;
    search?: string;
  }): Promise<Pipeline[]> {
    try {
      let query = `
        SELECT * FROM crm_pipelines 
        WHERE company_id = $1
      `;
      const params: any[] = [companyId];

      if (filters?.isActive !== undefined) {
        query += ` AND is_active = $${params.length + 1}`;
        params.push(filters.isActive);
      }

      if (filters?.search) {
        query += ` AND (name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
        params.push(`%${filters.search}%`);
      }

      query += ` ORDER BY created_at DESC;`;

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.logError('Error fetching pipelines', error as Error, { companyId });
      throw new Error('Failed to fetch pipelines');
    }
  }

  /**
   * Get pipeline by ID
   */
  async getPipelineById(pipelineId: string): Promise<Pipeline | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM crm_pipelines WHERE id = $1;`,
        [pipelineId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.logError('Error fetching pipeline', error as Error, { pipelineId });
      throw new Error('Failed to fetch pipeline');
    }
  }

  /**
   * Update pipeline
   */
  async updatePipeline(
    pipelineId: string,
    input: UpdatePipelineInput
  ): Promise<Pipeline> {
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
      if (input.color !== undefined) {
        updates.push(`color = $${paramIndex++}`);
        params.push(input.color);
      }
      if (input.icon !== undefined) {
        updates.push(`icon = $${paramIndex++}`);
        params.push(input.icon);
      }
      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(input.isActive);
      }

      if (updates.length === 0) {
        return this.getPipelineById(pipelineId) as Promise<Pipeline>;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(pipelineId);

      const query = `
        UPDATE crm_pipelines 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *;
      `;

      const result = await this.db.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.logError('Error updating pipeline', error as Error, { pipelineId });
      throw new Error('Failed to update pipeline');
    }
  }

  /**
   * Delete pipeline
   */
  async deletePipeline(pipelineId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `DELETE FROM crm_pipelines WHERE id = $1;`,
        [pipelineId]
      );
      return result.rowCount > 0;
    } catch (error) {
      logger.logError('Error deleting pipeline', error as Error, { pipelineId });
      throw new Error('Failed to delete pipeline');
    }
  }

  /**
   * Create pipeline stage
   */
  async createStage(
    pipelineId: string,
    input: CreatePipelineStageInput
  ): Promise<PipelineStage> {
    try {
      const query = `
        INSERT INTO crm_pipeline_stages (
          pipeline_id, name, position, color, description, 
          conversion_probability, is_default
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;

      const result = await this.db.query(query, [
        pipelineId,
        input.name,
        input.position,
        input.color || null,
        input.description || null,
        input.conversionProbability || 0,
        input.isDefault || false
      ]);

      return result.rows[0];
    } catch (error) {
      logger.logError('Error creating pipeline stage', error as Error, { pipelineId });
      throw new Error('Failed to create pipeline stage');
    }
  }

  /**
   * Get pipeline stages
   */
  async getPipelineStages(pipelineId: string): Promise<PipelineStage[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM crm_pipeline_stages WHERE pipeline_id = $1 ORDER BY position ASC;`,
        [pipelineId]
      );
      return result.rows;
    } catch (error) {
      logger.logError('Error fetching pipeline stages', error as Error, { pipelineId });
      throw new Error('Failed to fetch pipeline stages');
    }
  }

  /**
   * Move contact to different pipeline stage
   */
  async moveContactToStage(
    companyId: string,
    userId: string,
    input: MoveContactInPipelineInput
  ): Promise<PipelineHistory> {
    try {
      // Validate stage exists
      const stage = await this.db.query(
        `SELECT * FROM crm_pipeline_stages WHERE id = $1;`,
        [input.toStageId]
      );

      if (stage.rows.length === 0) {
        throw new Error('Target stage not found');
      }

      // Get current stage if exists
      let fromStageId = input.fromStageId;
      if (!fromStageId) {
        const current = await this.db.query(
          `
            SELECT to_stage_id FROM crm_pipeline_history 
            WHERE contact_id = $1 
            ORDER BY created_at DESC LIMIT 1;
          `,
          [input.contactId]
        );
        fromStageId = current.rows[0]?.to_stage_id;
      }

      // Record history
      const query = `
        INSERT INTO crm_pipeline_history (
          contact_id, pipeline_id, from_stage_id, to_stage_id, 
          company_id, moved_by, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;

      const result = await this.db.query(query, [
        input.contactId,
        stage.rows[0].pipeline_id,
        fromStageId || null,
        input.toStageId,
        companyId,
        userId,
        input.notes || null
      ]);

      logger.logInfo('Contact moved in pipeline', {
        contactId: input.contactId,
        toStageId: input.toStageId,
        movedBy: userId
      });

      return result.rows[0];
    } catch (error) {
      logger.logError('Error moving contact in pipeline', error as Error, {
        contactId: input.contactId
      });
      throw error;
    }
  }

  /**
   * Get pipeline history for contact
   */
  async getContactPipelineHistory(contactId: string): Promise<PipelineHistory[]> {
    try {
      const result = await this.db.query(
        `
          SELECT * FROM crm_pipeline_history 
          WHERE contact_id = $1 
          ORDER BY created_at DESC;
        `,
        [contactId]
      );
      return result.rows;
    } catch (error) {
      logger.logError('Error fetching pipeline history', error as Error, { contactId });
      throw new Error('Failed to fetch pipeline history');
    }
  }

  /**
   * Get stage statistics
   */
  async getStageStats(stageId: string): Promise<{
    contactCount: number;
    avgMoveTime?: number;
    conversionRate: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT contact_id) as contact_count,
          (SELECT conversion_probability FROM crm_pipeline_stages WHERE id = $1) as conversion_rate
        FROM crm_pipeline_history
        WHERE to_stage_id = $1;
      `;

      const result = await this.db.query(query, [stageId]);
      return {
        contactCount: parseInt(result.rows[0].contact_count),
        conversionRate: result.rows[0].conversion_rate || 0
      };
    } catch (error) {
      logger.logError('Error fetching stage stats', error as Error, { stageId });
      throw new Error('Failed to fetch stage statistics');
    }
  }
}
