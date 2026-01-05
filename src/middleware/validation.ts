/**
 * Validation Middleware
 * Express middleware for request validation using Zod
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import logger from '../utils/logger/index.js';

/**
 * Validate request against a Zod schema
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the entire request
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace request object with validated data (if needed)
      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;

      next();
    } catch (error: any) {
      logger.warn('Validation error', {
        metadata: {
          path: req.path,
          method: req.method,
          errors: error.errors,
        },
      });

      // Return validation error
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors?.map((e: any) => ({
          path: e.path.join('.'),
          message: e.message,
        })) || [],
      });
    }
  };
};

export default validate;
