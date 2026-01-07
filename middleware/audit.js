/**
 * Audit Middleware - Automatic audit logging for requests
 * 
 * Automatically logs all write operations (POST, PUT, DELETE, PATCH)
 * Only runs on authenticated routes (requires req.user to exist)
 */

import auditService from '../core/audit/AuditService.js';
import contextManager from '../core/context/ContextManager.js';

/**
 * Middleware to audit write operations
 * Only audits if user is authenticated (req.user exists)
 */
export function auditMiddleware(req, res, next) {
  // Only audit write operations
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Only audit if user is authenticated
  if (!req.user || !req.user.userId) {
    return next(); // Skip audit for public routes
  }

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to capture response
  res.json = function(data) {
    // Audit after response is sent
    setImmediate(async () => {
      try {
        const ctx = contextManager.getContext();
        if (!ctx || !ctx.companyId) {
          return; // Skip if no company context
        }

        // Determine action from method
        let action = 'create';
        if (req.method === 'PUT' || req.method === 'PATCH') {
          action = 'update';
        } else if (req.method === 'DELETE') {
          action = 'delete';
        }

        // Determine resource type from path
        const resourceType = extractResourceType(req.path);

        // Get resource ID from params or body
        const resourceId = req.params.id || req.body?.id || null;

        // Log audit
        await auditService.log({
          action,
          resourceType,
          resourceId,
          newValues: req.method !== 'DELETE' ? req.body : null,
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          }
        });
      } catch (error) {
        console.error('[AuditMiddleware] Error logging audit:', error);
        // Don't fail the request if audit fails
      }
    });

    return originalJson(data);
  };

  next();
}

/**
 * Extract resource type from path
 */
function extractResourceType(path) {
  // Remove leading slash and split
  const parts = path.split('/').filter(p => p);
  
  // Common patterns
  if (parts.includes('contacts')) return 'contact';
  if (parts.includes('automations')) return 'automation';
  if (parts.includes('campaigns')) return 'campaign';
  if (parts.includes('webhooks')) return 'webhook';
  if (parts.includes('users')) return 'user';
  if (parts.includes('companies')) return 'company';
  if (parts.includes('invoices')) return 'invoice';
  if (parts.includes('payments')) return 'payment';
  
  // Default to first part
  return parts[0] || 'unknown';
}
