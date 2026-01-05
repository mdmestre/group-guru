/**
 * Logging Middleware
 * Express middleware for request/response logging
 */

import { Request, Response, NextFunction } from 'express';
import logger, { logRequest, logError } from '../utils/logger/index';

/**
 * HTTP Request logging middleware
 * Logs incoming requests and response times
 */
export const requestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Log request details
  logger.http(`${req.method} ${req.path}`, {
    metadata: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
  });

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logRequest(req.method, req.path, res.statusCode, duration);

    // Log if response is error
    if (res.statusCode >= 400) {
      logger.warn(`Error response: ${res.statusCode}`, {
        metadata: {
          method: req.method,
          path: req.path,
          status: res.statusCode,
        },
      });
    }
  });

  next();
};

/**
 * Error logging middleware
 * Logs all errors that occur during request processing
 */
export const errorLoggingMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logError(`Request error: ${err.message}`, err, {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  next(err);
};

export default requestLoggingMiddleware;
