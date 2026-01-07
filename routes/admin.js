/**
 * Admin Routes - Observability & Monitoring
 * 
 * Provides endpoints for:
 * - Audit Logs
 * - Automation Debugger
 * - Webhook Monitor
 * - Jobs & Queues
 * - Campaign Analytics
 */

import express from 'express';
import { query } from '../database/connection.js';
import contextManager from '../core/context/ContextManager.js';
import { authenticateJWT, tenantMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and tenant context
router.use(authenticateJWT);
router.use(tenantMiddleware);

/**
 * GET /admin/audit-logs
 * Get audit logs with filters
 */
router.get('/audit-logs', async (req, res) => {
  try {
    // Use companyId from request (set by tenantMiddleware)
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(403).json({ error: 'Company context required' });
    }
    
    // Also update context for consistency
    const ctx = contextManager.getContext();
    if (ctx) {
      ctx.companyId = companyId;
    }
    const {
      severity,
      userId,
      requestId,
      resourceType,
      resourceId,
      action,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    let sql = `
      SELECT * FROM audit_logs
      WHERE company_id = $1
    `;
    const params = [ctx.companyId];
    let paramIndex = 2;

    if (severity) {
      sql += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (userId) {
      sql += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (requestId) {
      sql += ` AND request_id = $${paramIndex}`;
      params.push(requestId);
      paramIndex++;
    }

    if (resourceType) {
      sql += ` AND resource_type = $${paramIndex}`;
      params.push(resourceType);
      paramIndex++;
    }

    if (resourceId) {
      sql += ` AND resource_id = $${paramIndex}`;
      params.push(resourceId);
      paramIndex++;
    }

    if (action) {
      sql += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (startDate) {
      sql += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Parse JSON fields
    const logs = result.rows.map(row => ({
      ...row,
      old_values: row.old_values ? JSON.parse(row.old_values) : null,
      new_values: row.new_values ? JSON.parse(row.new_values) : null,
      changes: row.changes ? JSON.parse(row.changes) : null,
      resource_snapshot: row.resource_snapshot ? JSON.parse(row.resource_snapshot) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));

    res.json({ logs, total: logs.length });
  } catch (error) {
    console.error('[Admin] Error fetching audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/automation-debugger/:runId
 * Get automation run details with timeline
 */
router.get('/automation-debugger/:runId', async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(403).json({ error: 'Company context required' });
    }
    
    const { runId } = req.params;

    // Get run
    const runResult = await query(
      `SELECT * FROM automation_runs 
       WHERE id = $1 AND company_id = $2`,
      [runId, companyId]
    );

    if (runResult.rows.length === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const run = runResult.rows[0];

    // Get logs
    const logsResult = await query(
      `SELECT * FROM automation_logs 
       WHERE run_id = $1 
       ORDER BY executed_at ASC`,
      [runId]
    );

    // Get automation
    const automationResult = await query(
      'SELECT * FROM automations WHERE id = $1',
      [run.automation_id]
    );

    const logs = logsResult.rows.map(log => ({
      ...log,
      input_snapshot: log.input_snapshot ? JSON.parse(log.input_snapshot) : null,
      output_snapshot: log.output_snapshot ? JSON.parse(log.output_snapshot) : null
    }));

    res.json({
      run: {
        ...run,
        trigger_data: run.trigger_data ? JSON.parse(run.trigger_data) : null,
        execution_context: run.execution_context ? JSON.parse(run.execution_context) : null
      },
      automation: automationResult.rows[0] || null,
      logs,
      timeline: logs.map(log => ({
        nodeId: log.node_id,
        nodeType: log.node_type,
        status: log.status,
        executedAt: log.executed_at,
        duration: log.duration_ms,
        error: log.error_message
      }))
    });
  } catch (error) {
    console.error('[Admin] Error fetching automation debugger:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/webhook-monitor
 * Get webhook calls with filters
 */
router.get('/webhook-monitor', async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(403).json({ error: 'Company context required' });
    }
    
    const {
      webhookId,
      status,
      eventType,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    let sql = `
      SELECT wc.*, w.name as webhook_name, w.url
      FROM webhook_calls wc
      JOIN webhooks w ON wc.webhook_id = w.id
      WHERE w.company_id = $1
    `;
    const params = [companyId];
    let paramIndex = 2;

    if (webhookId) {
      sql += ` AND wc.webhook_id = $${paramIndex}`;
      params.push(webhookId);
      paramIndex++;
    }

    if (status) {
      sql += ` AND wc.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (eventType) {
      sql += ` AND wc.event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    if (startDate) {
      sql += ` AND wc.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND wc.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    sql += ` ORDER BY wc.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    const calls = result.rows.map(row => ({
      ...row,
      payload: row.payload ? JSON.parse(row.payload) : null
    }));

    res.json({ calls, total: calls.length });
  } catch (error) {
    console.error('[Admin] Error fetching webhook monitor:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/jobs
 * Get jobs with filters
 */
router.get('/jobs', async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(403).json({ error: 'Company context required' });
    }
    
    const {
      status,
      jobType,
      entityType,
      entityId,
      limit = 100,
      offset = 0
    } = req.query;

    let sql = `
      SELECT * FROM jobs
      WHERE company_id = $1
    `;
    const params = [companyId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (jobType) {
      sql += ` AND job_type = $${paramIndex}`;
      params.push(jobType);
      paramIndex++;
    }

    if (entityType) {
      sql += ` AND entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }

    if (entityId) {
      sql += ` AND entity_id = $${paramIndex}`;
      params.push(entityId);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    const jobs = result.rows.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null,
      opts: row.opts ? JSON.parse(row.opts) : null,
      returnvalue: row.returnvalue ? JSON.parse(row.returnvalue) : null,
      progress_data: row.progress_data ? JSON.parse(row.progress_data) : null,
      stacktrace: row.stacktrace ? JSON.parse(row.stacktrace) : null
    }));

    res.json({ jobs, total: jobs.length });
  } catch (error) {
    console.error('[Admin] Error fetching jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/campaign-analytics/:campaignId
 * Get campaign analytics
 */
router.get('/campaign-analytics/:campaignId', async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(403).json({ error: 'Company context required' });
    }
    
    const { campaignId } = req.params;

    // Get campaign
    const campaignResult = await query(
      'SELECT * FROM campaigns WHERE id = $1 AND company_id = $2',
      [campaignId, companyId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    // Get recipients stats
    const statsResult = await query(
      `SELECT 
        status,
        COUNT(*) as count
       FROM campaign_recipients
       WHERE campaign_id = $1
       GROUP BY status`,
      [campaignId]
    );

    const stats = {
      total: campaign.total_recipients,
      sent: campaign.sent_count,
      delivered: campaign.delivered_count,
      read: campaign.read_count,
      failed: campaign.failed_count,
      clicked: campaign.clicked_count,
      byStatus: {}
    };

    statsResult.rows.forEach(row => {
      stats.byStatus[row.status] = parseInt(row.count);
    });

    // Get timeline (messages sent over time)
    const timelineResult = await query(
      `SELECT 
        DATE_TRUNC('hour', sent_at) as hour,
        COUNT(*) as count
       FROM campaign_recipients
       WHERE campaign_id = $1 AND sent_at IS NOT NULL
       GROUP BY hour
       ORDER BY hour ASC`,
      [campaignId]
    );

    res.json({
      campaign,
      stats,
      timeline: timelineResult.rows
    });
  } catch (error) {
    console.error('[Admin] Error fetching campaign analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


