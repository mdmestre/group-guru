/**
 * Context Manager - Global Request Context Propagation
 * 
 * Manages and propagates request context across:
 * - HTTP Requests
 * - Workers (BullMQ)
 * - Webhooks
 * - Automations
 * - Audit Logs
 * 
 * Ensures every operation has:
 * - request_id (UUID for correlation)
 * - company_id (multi-tenant isolation)
 * - user_id (actor identification)
 * - source (api, job, webhook, system)
 * - ip_address
 * - user_agent
 */

import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

class ContextManager {
  constructor() {
    this.storage = new AsyncLocalStorage();
  }

  /**
   * Create a new context
   * @param {Object} context - Context data
   * @param {string} context.companyId - Company ID
   * @param {string} context.userId - User ID
   * @param {string} context.source - Source (api, job, webhook, system)
   * @param {string} context.ipAddress - IP address
   * @param {string} context.userAgent - User agent
   * @param {string} context.requestId - Optional request ID (generated if not provided)
   * @returns {Object} Context object
   */
  createContext(context = {}) {
    const requestId = context.requestId || uuidv4();
    
    return {
      requestId,
      companyId: context.companyId || null,
      userId: context.userId || null,
      source: context.source || 'api',
      ipAddress: context.ipAddress || null,
      userAgent: context.userAgent || null,
      metadata: context.metadata || {},
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Run a function within a context
   * Supports both sync and async functions
   * @param {Object} context - Context data
   * @param {Function} fn - Function to run (can be sync or async)
   * @returns {Promise<any>} Function result (always returns a Promise)
   */
  run(context, fn) {
    const ctx = this.createContext(context);
    return this.storage.run(ctx, () => {
      try {
        const result = fn();
        // If result is a Promise, handle it; otherwise wrap it
        if (result && typeof result.then === 'function') {
          return result.catch((error) => {
            // Attach context info to error for debugging
            error.context = ctx;
            throw error;
          });
        }
        return result;
      } catch (error) {
        // Attach context info to error for debugging (sync errors)
        error.context = ctx;
        throw error;
      }
    });
  }

  /**
   * Get current context
   * @returns {Object|null} Current context or null
   */
  getContext() {
    return this.storage.getStore() || null;
  }

  /**
   * Get request ID from current context
   * @returns {string|null} Request ID
   */
  getRequestId() {
    const ctx = this.getContext();
    return ctx?.requestId || null;
  }

  /**
   * Get company ID from current context
   * @returns {string|null} Company ID
   */
  getCompanyId() {
    const ctx = this.getContext();
    return ctx?.companyId || null;
  }

  /**
   * Get user ID from current context
   * @returns {string|null} User ID
   */
  getUserId() {
    const ctx = this.getContext();
    return ctx?.userId || null;
  }

  /**
   * Get source from current context
   * @returns {string} Source
   */
  getSource() {
    const ctx = this.getContext();
    return ctx?.source || 'api';
  }

  /**
   * Ensure context exists (throws if not)
   * @param {boolean} requireCompanyId - Whether to require companyId (default: true)
   * @throws {Error} If context is missing
   */
  requireContext(requireCompanyId = true) {
    const ctx = this.getContext();
    if (!ctx) {
      throw new Error('Context is required but not available. Ensure operation is run within a context.');
    }
    if (requireCompanyId && !ctx.companyId) {
      throw new Error(
        `companyId is required in context but is missing. ` +
        `Source: ${ctx.source}, RequestId: ${ctx.requestId || 'N/A'}. ` +
        `Ensure the request has a valid authentication token with companyId.`
      );
    }
    return ctx;
  }

  /**
   * Validate that context has companyId for database operations
   * @throws {Error} If companyId is missing
   */
  requireCompanyId() {
    const ctx = this.requireContext(true);
    return ctx.companyId;
  }

  /**
   * Extract context from Express request
   * @param {Object} req - Express request
   * @returns {Object} Context object
   */
  fromRequest(req) {
    // Extract companyId from multiple possible sources
    let companyId = req.companyId || null;
    
    // If not in req.companyId, try req.user (set by authenticateJWT)
    if (!companyId && req.user) {
      companyId = req.user.companyId || req.user.company_id || null;
    }
    
    // Extract userId
    let userId = req.userId || null;
    if (!userId && req.user) {
      userId = req.user.userId || req.user.user_id || req.user.id || null;
    }
    
    return {
      companyId,
      userId,
      source: 'api',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      requestId: req.headers['x-request-id'] || null,
      metadata: {
        method: req.method,
        path: req.path,
        url: req.url
      }
    };
  }

  /**
   * Extract context from BullMQ job
   * @param {Object} job - BullMQ job
   * @returns {Object} Context object
   */
  fromJob(job) {
    const data = job.data || {};
    return {
      companyId: data.companyId || data.context?.companyId || null,
      userId: data.userId || data.context?.userId || null,
      source: 'job',
      ipAddress: null,
      userAgent: null,
      requestId: data.requestId || data.context?.requestId || null,
      metadata: {
        queue: job.queueName,
        jobId: job.id,
        jobType: job.name
      }
    };
  }

  /**
   * Extract context from webhook request
   * @param {Object} req - Express request
   * @param {string} companyId - Company ID
   * @returns {Object} Context object
   */
  fromWebhook(req, companyId) {
    return {
      companyId,
      userId: null,
      source: 'webhook',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      requestId: req.headers['x-request-id'] || null,
      metadata: {
        method: req.method,
        path: req.path,
        webhookId: req.params?.webhookId || null
      }
    };
  }

  /**
   * Extract context from system operation
   * @param {string} companyId - Company ID (optional)
   * @returns {Object} Context object
   */
  fromSystem(companyId = null) {
    return {
      companyId,
      userId: null,
      source: 'system',
      ipAddress: null,
      userAgent: null,
      requestId: null,
      metadata: {}
    };
  }
}

// Singleton instance
const contextManager = new ContextManager();

export default contextManager;


