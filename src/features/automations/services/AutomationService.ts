/**
 * Automation Service
 * Handles all automation operations
 * Phase 3: Intelligent Automations
 */

import { logger } from '@/utils/logger';
import type {
  Automation,
  AutomationRun,
  AutomationLog,
  CreateAutomationInput,
  UpdateAutomationInput,
  TestAutomationInput,
  AutomationTestResult,
  FlowDefinition
} from '../models/types';

export class AutomationService {
  private db: any; // PostgreSQL client

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Create a new automation
   */
  async createAutomation(
    companyId: string,
    userId: string,
    input: CreateAutomationInput
  ): Promise<Automation> {
    try {
      const query = `
        INSERT INTO automations (
          company_id, name, description, flow_definition,
          trigger_type, trigger_config, is_active, version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
        RETURNING *;
      `;

      const result = await this.db.query(query, [
        companyId,
        input.name,
        input.description || null,
        JSON.stringify(input.flowDefinition),
        input.triggerType,
        JSON.stringify(input.triggerConfig),
        input.isActive !== false
      ]);

      logger.logInfo('Automation created', {
        automationId: result.rows[0].id,
        companyId,
        userId
      });

      return this.mapToAutomation(result.rows[0]);
    } catch (error: any) {
      logger.logError('Error creating automation', error);
      throw new Error(`Failed to create automation: ${error.message}`);
    }
  }

  /**
   * Get all automations for a company
   */
  async getAutomations(companyId: string): Promise<Automation[]> {
    try {
      const query = `
        SELECT * FROM automations
        WHERE company_id = $1
        ORDER BY created_at DESC;
      `;

      const result = await this.db.query(query, [companyId]);
      return result.rows.map((row: any) => this.mapToAutomation(row));
    } catch (error: any) {
      logger.logError('Error fetching automations', error);
      throw new Error(`Failed to fetch automations: ${error.message}`);
    }
  }

  /**
   * Get a single automation by ID
   */
  async getAutomationById(
    companyId: string,
    automationId: string
  ): Promise<Automation | null> {
    try {
      const query = `
        SELECT * FROM automations
        WHERE id = $1 AND company_id = $2;
      `;

      const result = await this.db.query(query, [automationId, companyId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToAutomation(result.rows[0]);
    } catch (error: any) {
      logger.logError('Error fetching automation', error);
      throw new Error(`Failed to fetch automation: ${error.message}`);
    }
  }

  /**
   * Update an automation
   */
  async updateAutomation(
    companyId: string,
    automationId: string,
    input: UpdateAutomationInput
  ): Promise<Automation> {
    try {
      // Get current version
      const current = await this.getAutomationById(companyId, automationId);
      if (!current) {
        throw new Error('Automation not found');
      }

      // Increment version if flow definition changed
      const newVersion = input.flowDefinition
        ? current.version + 1
        : current.version;

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }
      if (input.flowDefinition !== undefined) {
        updates.push(`flow_definition = $${paramIndex++}`);
        values.push(JSON.stringify(input.flowDefinition));
        updates.push(`version = $${paramIndex++}`);
        values.push(newVersion);
      }
      if (input.triggerType !== undefined) {
        updates.push(`trigger_type = $${paramIndex++}`);
        values.push(input.triggerType);
      }
      if (input.triggerConfig !== undefined) {
        updates.push(`trigger_config = $${paramIndex++}`);
        values.push(JSON.stringify(input.triggerConfig));
      }
      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(input.isActive);
      }
      if (input.isPaused !== undefined) {
        updates.push(`is_paused = $${paramIndex++}`);
        values.push(input.isPaused);
      }

      updates.push(`updated_at = NOW()`);
      values.push(automationId, companyId);

      const query = `
        UPDATE automations
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
        RETURNING *;
      `;

      const result = await this.db.query(query, values);

      logger.logInfo('Automation updated', {
        automationId,
        companyId,
        newVersion
      });

      return this.mapToAutomation(result.rows[0]);
    } catch (error: any) {
      logger.logError('Error updating automation', error);
      throw new Error(`Failed to update automation: ${error.message}`);
    }
  }

  /**
   * Delete an automation
   */
  async deleteAutomation(
    companyId: string,
    automationId: string
  ): Promise<void> {
    try {
      const query = `
        DELETE FROM automations
        WHERE id = $1 AND company_id = $2;
      `;

      await this.db.query(query, [automationId, companyId]);

      logger.logInfo('Automation deleted', {
        automationId,
        companyId
      });
    } catch (error: any) {
      logger.logError('Error deleting automation', error);
      throw new Error(`Failed to delete automation: ${error.message}`);
    }
  }

  /**
   * Get automation runs
   */
  async getAutomationRuns(
    companyId: string,
    automationId?: string,
    limit: number = 50
  ): Promise<AutomationRun[]> {
    try {
      let query = `
        SELECT * FROM automation_runs
        WHERE company_id = $1
      `;
      const params: any[] = [companyId];

      if (automationId) {
        query += ` AND automation_id = $2`;
        params.push(automationId);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await this.db.query(query, params);
      return result.rows.map((row: any) => this.mapToAutomationRun(row));
    } catch (error: any) {
      logger.logError('Error fetching automation runs', error);
      throw new Error(`Failed to fetch automation runs: ${error.message}`);
    }
  }

  /**
   * Get automation logs for a run
   */
  async getAutomationLogs(
    companyId: string,
    runId: string
  ): Promise<AutomationLog[]> {
    try {
      const query = `
        SELECT * FROM automation_logs
        WHERE run_id = $1 AND company_id = $2
        ORDER BY executed_at ASC;
      `;

      const result = await this.db.query(query, [runId, companyId]);
      return result.rows.map((row: any) => this.mapToAutomationLog(row));
    } catch (error: any) {
      logger.logError('Error fetching automation logs', error);
      throw new Error(`Failed to fetch automation logs: ${error.message}`);
    }
  }

  /**
   * Test an automation (dry-run)
   */
  async testAutomation(
    companyId: string,
    input: TestAutomationInput
  ): Promise<AutomationTestResult> {
    try {
      // Import AutomationEngine dynamically
      const { default: automationEngine } = await import(
        '../../../../core/automation/AutomationEngine.js'
      );

      const automation = await this.getAutomationById(
        companyId,
        input.automationId
      );

      if (!automation) {
        throw new Error('Automation not found');
      }

      // Create a test run
      const run = await automationEngine.createRun(
        input.automationId,
        input.contactId || null,
        input.triggerData || {}
      );

      if (input.dryRun) {
        // In dry-run mode, we simulate execution without actually executing
        // This would require a separate test execution method
        return {
          success: true,
          executedNodes: [],
          skippedNodes: [],
          errors: [],
          finalContext: {}
        };
      }

      // Execute the run
      const result = await automationEngine.executeRun(run.id);

      // Get logs
      const logs = await this.getAutomationLogs(companyId, run.id);

      return {
        success: result.status === 'completed',
        executedNodes: logs
          .filter((log) => log.status === 'success')
          .map((log) => log.nodeId),
        skippedNodes: logs
          .filter((log) => log.status === 'skipped')
          .map((log) => log.nodeId),
        errors: logs
          .filter((log) => log.status === 'failed')
          .map((log) => ({
            nodeId: log.nodeId,
            error: log.errorMessage || 'Unknown error'
          })),
        finalContext: result.executionContext || {}
      };
    } catch (error: any) {
      logger.logError('Error testing automation', error);
      throw new Error(`Failed to test automation: ${error.message}`);
    }
  }

  /**
   * Map database row to Automation
   */
  private mapToAutomation(row: any): Automation {
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      description: row.description,
      version: row.version,
      flowDefinition: row.flow_definition,
      triggerType: row.trigger_type,
      triggerConfig: row.trigger_config,
      isActive: row.is_active,
      isPaused: row.is_paused,
      totalRuns: row.total_runs || 0,
      successfulRuns: row.successful_runs || 0,
      failedRuns: row.failed_runs || 0,
      lastRunAt: row.last_run_at ? new Date(row.last_run_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to AutomationRun
   */
  private mapToAutomationRun(row: any): AutomationRun {
    return {
      id: row.id,
      automationId: row.automation_id,
      companyId: row.company_id,
      automationVersion: row.automation_version,
      contactId: row.contact_id,
      triggerData: row.trigger_data,
      executionContext: row.execution_context,
      lockKey: row.lock_key,
      status: row.status,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at) : undefined,
      delayUntil: row.delay_until ? new Date(row.delay_until) : undefined,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to AutomationLog
   */
  private mapToAutomationLog(row: any): AutomationLog {
    return {
      id: row.id,
      runId: row.run_id,
      companyId: row.company_id,
      nodeId: row.node_id,
      nodeType: row.node_type,
      actionType: row.action_type,
      status: row.status,
      inputSnapshot: row.input_snapshot,
      outputSnapshot: row.output_snapshot,
      errorMessage: row.error_message,
      executedAt: new Date(row.executed_at),
      durationMs: row.duration_ms
    };
  }
}

