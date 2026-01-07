/**
 * Audit Log Service - Centralized Audit Logging
 * 
 * Single source of truth for all audit logs.
 * No direct writes to audit_logs table - all go through this service.
 * 
 * Features:
 * - Automatic severity detection
 * - Request correlation
 * - Resource snapshots
 * - Multi-tenant isolation
 */

import { query } from '../../database/connection.js';
import contextManager from '../context/ContextManager.js';

class AuditService {
  /**
   * Determine severity based on action and resource type
   * @param {string} action - Action type
   * @param {string} resourceType - Resource type
   * @param {Object} metadata - Additional metadata
   * @returns {string} Severity (info, warning, critical)
   */
  determineSeverity(action, resourceType, metadata = {}) {
    // Critical actions
    const criticalActions = [
      'delete',
      'payment_failed',
      'failed_login',
      'permission_change',
      'system'
    ];

    // Critical resource types
    const criticalResources = [
      'invoice',
      'payment',
      'subscription',
      'user',
      'company'
    ];

    if (criticalActions.includes(action) || criticalResources.includes(resourceType)) {
      return 'critical';
    }

    // Warning actions
    const warningActions = [
      'update',
      'status_change',
      'export',
      'import'
    ];

    if (warningActions.includes(action)) {
      return 'warning';
    }

    // Default to info
    return 'info';
  }

  /**
   * Calculate diff between old and new values
   * @param {Object} oldValues - Old values
   * @param {Object} newValues - New values
   * @returns {Object} Diff object
   */
  calculateDiff(oldValues, newValues) {
    if (!oldValues || !newValues) {
      return {};
    }

    const diff = {};
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    for (const key of allKeys) {
      const oldVal = oldValues[key];
      const newVal = newValues[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff[key] = {
          old: oldVal,
          new: newVal
        };
      }
    }

    return diff;
  }

  /**
   * Log an audit event
   * 
   * IMPORTANT: This is the ONLY way to write to audit_logs table.
   * Direct INSERTs to audit_logs are PROHIBITED.
   * 
   * @param {Object} params - Audit log parameters
   * @param {string} params.action - Action (create, update, delete, etc.)
   * @param {string} params.resourceType - Resource type (contact, automation, etc.)
   * @param {string} params.resourceId - Resource ID (optional)
   * @param {Object} params.oldValues - Old values (optional)
   * @param {Object} params.newValues - New values (optional)
   * @param {Object} params.resourceSnapshot - Full resource snapshot (optional)
   * @param {string} params.severity - Override severity (optional)
   * @param {Object} params.metadata - Additional metadata (optional)
   * @returns {Promise<Object>} Created audit log
   */
  async log({
    action,
    resourceType,
    resourceId = null,
    oldValues = null,
    newValues = null,
    resourceSnapshot = null,
    severity = null,
    metadata = {}
  }) {
    // Validate required parameters
    if (!action || typeof action !== 'string') {
      throw new Error('AuditService.log: action is required and must be a string');
    }
    
    if (!resourceType || typeof resourceType !== 'string') {
      throw new Error('AuditService.log: resourceType is required and must be a string');
    }
    
    // Get context - REQUIRED (companyId must be present)
    const ctx = contextManager.requireContext(true);

    // Determine severity if not provided
    const finalSeverity = severity || this.determineSeverity(action, resourceType, metadata);

    // Calculate diff
    const changes = this.calculateDiff(oldValues, newValues);

    // Build audit log entry
    const auditLog = {
      company_id: ctx.companyId,
      user_id: ctx.userId,
      user_email: metadata.userEmail || null,
      ip_address: ctx.ipAddress,
      user_agent: ctx.userAgent,
      request_id: ctx.requestId,
      source: ctx.source,
      severity: finalSeverity,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      changes: Object.keys(changes).length > 0 ? JSON.stringify(changes) : null,
      resource_snapshot: resourceSnapshot ? JSON.stringify(resourceSnapshot) : null,
      metadata: JSON.stringify({
        ...ctx.metadata,
        ...metadata
      })
    };

    // Insert into database
    // NOTE: This is the ONLY place where INSERT INTO audit_logs should occur
    // All other code must use auditService.log() instead
    try {
      const result = await query(
        `INSERT INTO audit_logs (
          company_id, user_id, user_email, ip_address, user_agent, request_id,
          source, severity, action, resource_type, resource_id,
          old_values, new_values, changes, resource_snapshot, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *`,
        [
          auditLog.company_id,
          auditLog.user_id,
          auditLog.user_email,
          auditLog.ip_address,
          auditLog.user_agent,
          auditLog.request_id,
          auditLog.source,
          auditLog.severity,
          auditLog.action,
          auditLog.resource_type,
          auditLog.resource_id,
          auditLog.old_values,
          auditLog.new_values,
          auditLog.changes,
          auditLog.resource_snapshot,
          auditLog.metadata
        ]
      );

      return result.rows[0];
    } catch (error) {
      // Log error but don't throw - audit failures shouldn't break the application
      console.error('[AuditService] Failed to write audit log:', {
        action,
        resourceType,
        resourceId,
        companyId: ctx.companyId,
        requestId: ctx.requestId,
        error: error.message
      });
      
      // In development, throw to catch issues early
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
      
      // Return a mock object to prevent breaking the caller
      return {
        id: null,
        company_id: auditLog.company_id,
        action: auditLog.action,
        resource_type: auditLog.resource_type,
        created_at: new Date()
      };
    }
  }

  /**
   * Log contact creation
   */
  async logContactCreated(contactId, contactData) {
    return this.log({
      action: 'create',
      resourceType: 'contact',
      resourceId: contactId,
      newValues: contactData,
      resourceSnapshot: contactData
    });
  }

  /**
   * Log contact update
   */
  async logContactUpdated(contactId, oldData, newData) {
    return this.log({
      action: 'update',
      resourceType: 'contact',
      resourceId: contactId,
      oldValues: oldData,
      newValues: newData
    });
  }

  /**
   * Log contact stage change
   */
  async logContactStageChanged(contactId, oldStage, newStage) {
    return this.log({
      action: 'status_change',
      resourceType: 'contact',
      resourceId: contactId,
      oldValues: { stage: oldStage },
      newValues: { stage: newStage },
      severity: 'warning'
    });
  }

  /**
   * Log automation start
   */
  async logAutomationStarted(automationId, runId, triggerData) {
    return this.log({
      action: 'create',
      resourceType: 'automation_run',
      resourceId: runId,
      newValues: {
        automationId,
        triggerData
      },
      metadata: {
        automationId
      }
    });
  }

  /**
   * Log automation completion
   */
  async logAutomationCompleted(runId, result) {
    return this.log({
      action: 'update',
      resourceType: 'automation_run',
      resourceId: runId,
      newValues: {
        status: 'completed',
        result
      }
    });
  }

  /**
   * Log automation failure
   */
  async logAutomationFailed(runId, error) {
    return this.log({
      action: 'update',
      resourceType: 'automation_run',
      resourceId: runId,
      newValues: {
        status: 'failed',
        error: error.message
      },
      severity: 'critical'
    });
  }

  /**
   * Log campaign start
   */
  async logCampaignStarted(campaignId, campaignData) {
    return this.log({
      action: 'create',
      resourceType: 'campaign',
      resourceId: campaignId,
      newValues: campaignData,
      severity: 'warning'
    });
  }

  /**
   * Log campaign completion
   */
  async logCampaignCompleted(campaignId, stats) {
    return this.log({
      action: 'update',
      resourceType: 'campaign',
      resourceId: campaignId,
      newValues: {
        status: 'completed',
        stats
      }
    });
  }

  /**
   * Log payment success
   */
  async logPaymentSuccess(paymentId, amount, currency) {
    return this.log({
      action: 'payment_success',
      resourceType: 'payment',
      resourceId: paymentId,
      newValues: {
        amount,
        currency,
        status: 'paid'
      },
      severity: 'critical'
    });
  }

  /**
   * Log payment failure
   */
  async logPaymentFailed(paymentId, error) {
    return this.log({
      action: 'payment_failed',
      resourceType: 'payment',
      resourceId: paymentId,
      newValues: {
        status: 'failed',
        error: error.message
      },
      severity: 'critical'
    });
  }

  /**
   * Log user login
   */
  async logUserLogin(userId, userEmail) {
    return this.log({
      action: 'login',
      resourceType: 'user',
      resourceId: userId,
      newValues: {
        email: userEmail
      },
      metadata: {
        userEmail
      }
    });
  }

  /**
   * Log failed login attempt
   */
  async logFailedLogin(email, reason) {
    return this.log({
      action: 'failed_login',
      resourceType: 'user',
      resourceId: null,
      newValues: {
        email,
        reason
      },
      severity: 'critical',
      metadata: {
        email
      }
    });
  }
}

// Singleton instance
const auditService = new AuditService();

export default auditService;


