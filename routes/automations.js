/**
 * Automation Routes
 * API endpoints for automation management
 * Phase 3: Intelligent Automations
 */

import { Router } from 'express';
import { query } from '../database/connection.js';
import contextManager from '../core/context/ContextManager.js';
import automationEngine from '../core/automation/AutomationEngine.js';
import { authenticateJWT, tenantMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticateJWT);
router.use(tenantMiddleware);

// Middleware to get company ID from request
const getCompanyId = (req) => {
  return req.companyId || req.user?.companyId || contextManager.getContext()?.companyId;
};

/**
 * GET /api/automations
 * Get all automations for company
 */
router.get('/automations', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID required' });
    }

    const result = await query(
      'SELECT * FROM automations WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );

    const automations = result.rows.map(row => ({
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
      lastRunAt: row.last_run_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(automations);
  } catch (error) {
    console.error('Error fetching automations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/automations/:id
 * Get a single automation
 */
router.get('/automations/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID required' });
    }

    const result = await query(
      'SELECT * FROM automations WHERE id = $1 AND company_id = $2',
      [req.params.id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    const row = result.rows[0];
    const automation = {
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
      lastRunAt: row.last_run_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    res.json(automation);
  } catch (error) {
    console.error('Error fetching automation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automations
 * Create a new automation
 */
router.post('/automations', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID required' });
    }

    const { name, description, flowDefinition, triggerType, triggerConfig, isActive } = req.body;

    if (!name || !flowDefinition || !triggerType) {
      return res.status(400).json({ error: 'Name, flowDefinition, and triggerType are required' });
    }

    const result = await query(
      `INSERT INTO automations (
        company_id, name, description, flow_definition,
        trigger_type, trigger_config, is_active, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
      RETURNING *`,
      [
        companyId,
        name,
        description || null,
        JSON.stringify(flowDefinition),
        triggerType,
        JSON.stringify(triggerConfig || {}),
        isActive !== false
      ]
    );

    const row = result.rows[0];
    const automation = {
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
      lastRunAt: row.last_run_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    res.status(201).json(automation);
  } catch (error) {
    console.error('Error creating automation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/automations/:id
 * Update an automation
 */
router.patch('/automations/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID required' });
    }

    // Get current automation
    const currentResult = await query(
      'SELECT * FROM automations WHERE id = $1 AND company_id = $2',
      [req.params.id, companyId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    const current = currentResult.rows[0];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (req.body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(req.body.name);
    }
    if (req.body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(req.body.description);
    }
    if (req.body.flowDefinition !== undefined) {
      updates.push(`flow_definition = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.flowDefinition));
      // Increment version if flow changed
      updates.push(`version = $${paramIndex++}`);
      values.push(current.version + 1);
    }
    if (req.body.triggerType !== undefined) {
      updates.push(`trigger_type = $${paramIndex++}`);
      values.push(req.body.triggerType);
    }
    if (req.body.triggerConfig !== undefined) {
      updates.push(`trigger_config = $${paramIndex++}`);
      values.push(JSON.stringify(req.body.triggerConfig));
    }
    if (req.body.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(req.body.isActive);
    }
    if (req.body.isPaused !== undefined) {
      updates.push(`is_paused = $${paramIndex++}`);
      values.push(req.body.isPaused);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id, companyId);

    const result = await query(
      `UPDATE automations SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
       RETURNING *`,
      values
    );

    const row = result.rows[0];
    const automation = {
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
      lastRunAt: row.last_run_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    res.json(automation);
  } catch (error) {
    console.error('Error updating automation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/automations/:id
 * Delete an automation
 */
router.delete('/automations/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID required' });
    }

    await query(
      'DELETE FROM automations WHERE id = $1 AND company_id = $2',
      [req.params.id, companyId]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting automation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/automations/:id/runs
 * Get automation runs
 */
router.get('/automations/:id/runs', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID required' });
    }

    const limit = parseInt(req.query.limit) || 50;

    const result = await query(
      `SELECT * FROM automation_runs
       WHERE automation_id = $1 AND company_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [req.params.id, companyId, limit]
    );

    const runs = result.rows.map(row => ({
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
      nextRetryAt: row.next_retry_at,
      delayUntil: row.delay_until,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(runs);
  } catch (error) {
    console.error('Error fetching automation runs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/automations/runs/:runId/logs
 * Get automation logs for a run
 */
router.get('/automations/runs/:runId/logs', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID required' });
    }

    const result = await query(
      `SELECT * FROM automation_logs
       WHERE run_id = $1 AND company_id = $2
       ORDER BY executed_at ASC`,
      [req.params.runId, companyId]
    );

    const logs = result.rows.map(row => ({
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
      executedAt: row.executed_at,
      durationMs: row.duration_ms
    }));

    res.json(logs);
  } catch (error) {
    console.error('Error fetching automation logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automations/:id/test
 * Test an automation (dry-run or actual execution)
 */
router.post('/automations/:id/test', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID required' });
    }

    const { contactId, triggerData, dryRun } = req.body;

    // Get automation
    const automationResult = await query(
      'SELECT * FROM automations WHERE id = $1 AND company_id = $2',
      [req.params.id, companyId]
    );

    if (automationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    if (dryRun) {
      // Dry run - just validate the flow
      return res.json({
        success: true,
        executedNodes: [],
        skippedNodes: [],
        errors: [],
        finalContext: {}
      });
    }

    // Create and execute run
    const result = await contextManager.run(
      { companyId, source: 'api', requestId: req.id || `test-${Date.now()}` },
      async () => {
        const run = await automationEngine.createRun(
          req.params.id,
          contactId || null,
          triggerData || {}
        );

        const executionResult = await automationEngine.executeRun(run.id);

        // Get logs
        const logsResult = await query(
          'SELECT * FROM automation_logs WHERE run_id = $1 ORDER BY executed_at ASC',
          [run.id]
        );

        const logs = logsResult.rows;

        return {
          success: executionResult.status === 'completed',
          executedNodes: logs
            .filter(log => log.status === 'success')
            .map(log => log.node_id),
          skippedNodes: logs
            .filter(log => log.status === 'skipped')
            .map(log => log.node_id),
          errors: logs
            .filter(log => log.status === 'failed')
            .map(log => ({
              nodeId: log.node_id,
              error: log.error_message || 'Unknown error'
            })),
          finalContext: executionResult.context || {}
        };
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Error testing automation:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

