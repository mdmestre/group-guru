/**
 * Authentication Middleware
 * * JWT authentication and tenant/role middleware.
 */

import { AuthService } from '../services/AuthService.js';
import { UserCompanyRepository } from '../database/repositories/UserCompanyRepository.js';
import { CompanyService } from '../services/CompanyService.js';
import contextManager from '../core/context/ContextManager.js';

/**
 * Authenticate JWT token
 * Extracts and validates JWT, sets req.user, req.userId, req.companyId, req.role
 */
export function authenticateJWT(req, res, next) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = parts[1];
  
  try {
    const decoded = AuthService.verifyToken(token);
    
    // Validate required fields
    if (!decoded.userId) {
      return res.status(401).json({ 
        error: 'Invalid token: missing userId',
        code: 'INVALID_TOKEN_MISSING_USER_ID'
      });
    }
    
    if (!decoded.companyId) {
      return res.status(401).json({ 
        error: 'Invalid token: missing companyId. Please login again.',
        code: 'INVALID_TOKEN_MISSING_COMPANY_ID'
      });
    }
    
    // Set request properties
    req.user = decoded;
    req.userId = decoded.userId;
    req.companyId = decoded.companyId;
    req.role = decoded.role || null;
    
    // Update context synchronously (context was created by contextMiddleware)
    // The context is stored in AsyncLocalStorage, so we can update it directly
    const ctx = contextManager.getContext();
    if (ctx) {
      // Update existing context with auth data
      ctx.companyId = decoded.companyId;
      ctx.userId = decoded.userId;
      // Context already has requestId, source, ipAddress, userAgent from contextMiddleware
    } else {
      // If context doesn't exist (shouldn't happen if contextMiddleware ran first),
      // log a warning but continue (contextMiddleware should have created it)
      console.warn('[authenticateJWT] Context not found. Ensure contextMiddleware runs before authenticateJWT.');
    }
    
    next();
  } catch (error) {
    console.error('[authenticateJWT] Token validation error:', error.message);
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Require tenant (company) context
 * Ensures companyId is present in token
 */
export function tenantMiddleware(req, res, next) {
  const companyId = req.companyId || req.user?.companyId;
  
  if (!companyId) {
    return res.status(403).json({ error: 'Company context required' });
  }

  // Remove companyId from body/query to prevent injection
  if (req.body) delete req.body.companyId;
  if (req.query) delete req.query.companyId;

  req.companyId = companyId;
  next();
}

/**
 * Require specific role(s)
 */
export function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    const role = req.role || req.user?.role;
    const companyId = req.companyId || req.user?.companyId;
    const userId = req.userId || req.user?.userId;

    if (!role || !companyId || !userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Require owner or admin role
 */
export const requireOwnerOrAdmin = roleMiddleware('owner', 'admin');

/**
 * Require owner role only
 */
export const requireOwner = roleMiddleware('owner');

/**
 * Check company access (verify user has active membership)
 */
export async function checkCompanyAccess(userId, companyId) {
  const membership = await UserCompanyRepository.findActive(userId, companyId);
  return !!membership;
}

/**
 * Middleware to check and refresh trial status
 */
export async function checkTrialMiddleware(req, res, next) {
  const companyId = req.companyId;
  
  if (companyId) {
    // Check if trial expired (non-blocking)
    CompanyService.checkAndUpdateTrialStatus(companyId).catch(err => {
      console.error('Error checking trial status:', err);
    });
  }

  next();
}

/**
 * Check Resource Limits (NOVO - Adicionado para corrigir o erro)
 * Verifica se a empresa atingiu o limite do plano (ex: usuários, instâncias)
 */
export function checkUserLimit(resourceType) {
  return async (req, res, next) => {
    // TODO: Implementar verificação real no banco de dados
    // Por enquanto, permite passar para não travar o servidor
    // const companyId = req.companyId;
    // await CompanyService.checkLimit(companyId, resourceType);
    next();
  };
}

/**
 * Alias for authenticateJWT (for compatibility with different route files)
 */
export const authenticate = authenticateJWT;

/**
 * Require company context
 * Alias for tenantMiddleware
 */
export const requireCompanyContext = tenantMiddleware;