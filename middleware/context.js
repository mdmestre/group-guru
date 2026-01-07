/**
 * Context Middleware - Express middleware for context propagation
 * 
 * Automatically creates and propagates context for all HTTP requests.
 * Works with or without authentication (for public routes).
 */

import contextManager from '../core/context/ContextManager.js';

/**
 * Middleware to create and propagate context
 * Safe to use on public routes (doesn't require authentication)
 * 
 * Creates a context using AsyncLocalStorage and propagates it through
 * the entire request/response cycle.
 */
export function contextMiddleware(req, res, next) {
  const context = contextManager.fromRequest(req);
  
  // Run the entire request handling within the context
  // AsyncLocalStorage.run() synchronously establishes the context
  // and the callback runs synchronously as well
  contextManager.run(context, () => {
    try {
      // Attach context to request for easy access
      req.context = contextManager.getContext();
      next();
    } catch (error) {
      // If next() throws synchronously, handle it
      console.error('[ContextMiddleware] Error in context execution:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });
}

/**
 * Middleware to require authentication and company context
 * Use this AFTER authenticateJWT middleware
 */
export function requireCompanyContext(req, res, next) {
  const ctx = contextManager.getContext();
  
  if (!ctx || !ctx.companyId) {
    return res.status(403).json({ 
      error: 'Company context required',
      code: 'MISSING_COMPANY_CONTEXT'
    });
  }
  
  next();
}
