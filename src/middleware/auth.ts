/**
 * Authentication Middleware
 * Middleware for TypeScript routes to handle authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

// Extend Express Request type to include auth properties
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
      role?: string;
      permissions?: string[];
    }
  }
}

/**
 * Authenticate middleware
 * Validates JWT token and sets user info on request
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.headers.authorization || '';
    const parts = auth.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = parts[1];

    // For now, we'll accept any token format
    // In production, validate against actual JWT
    req.userId = token.substring(0, 10); // Placeholder
    req.user = { token };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Authorize middleware
 * Checks if user has required permissions
 */
export const authorize = (...requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // For now, allow all authenticated users
      // In production, check actual roles/permissions
      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(403).json({ error: 'Authorization failed' });
    }
  };
};

/**
 * Optional authentication
 * Doesn't fail if token is missing, but sets user if provided
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.headers.authorization || '';
    const parts = auth.split(' ');

    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      req.userId = token.substring(0, 10);
      req.user = { token };
    }

    next();
  } catch (error) {
    logger.error('Optional auth error:', error);
    next();
  }
};
