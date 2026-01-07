/**
 * Segments Routes
 * API endpoints for segment management
 */

import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { SegmentService } from '../services/SegmentService';
import { z } from 'zod';
import { logger } from '@/utils/logger';

const router = Router();

// Validation schemas
const ruleSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan',
    'greaterOrEqual', 'lessOrEqual', 'in', 'notIn', 'startsWith', 'endsWith',
    'isEmpty', 'isNotEmpty', 'inRange'
  ]),
  value: z.any().optional(),
  fieldType: z.string().optional()
});

const createSegmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  criteria: z.object({
    rules: z.array(ruleSchema)
  }),
  filterLogic: z.enum(['AND', 'OR']).optional()
});

const updateSegmentSchema = createSegmentSchema.partial();

const evaluateSegmentSchema = z.object({
  criteria: z.object({
    rules: z.array(ruleSchema)
  }),
  filterLogic: z.enum(['AND', 'OR']).optional()
});

// Middleware to inject service
const getSegmentService = (req: Request): SegmentService => {
  return new SegmentService(req.app.get('db'));
};

/**
 * GET /api/segments
 * Get all segments
 */
router.get(
  '/',
  authenticate,
  authorize('view:segments'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const service = getSegmentService(req);

      const segments = await service.getSegments(companyId, {
        isActive: req.query.active !== 'false',
        isSmart: req.query.smart === 'true'
      });

      res.json({
        success: true,
        data: segments,
        count: segments.length
      });
    } catch (error) {
      logger.logError('Error fetching segments', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch segments'
      });
    }
  }
);

/**
 * GET /api/segments/:id
 * Get specific segment
 */
router.get(
  '/:id',
  authenticate,
  authorize('view:segments'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const service = getSegmentService(req);

      const segment = await service.getSegmentById(id);
      if (!segment) {
        return res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
      }

      res.json({
        success: true,
        data: segment
      });
    } catch (error) {
      logger.logError('Error fetching segment', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch segment'
      });
    }
  }
);

/**
 * POST /api/segments
 * Create segment
 */
router.post(
  '/',
  authenticate,
  authorize('create:segments'),
  validate(createSegmentSchema),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const userId = req.user?.id!;
      const service = getSegmentService(req);

      const segment = await service.createSegment(companyId, userId, req.body);

      res.status(201).json({
        success: true,
        data: segment
      });
    } catch (error) {
      logger.logError('Error creating segment', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to create segment'
      });
    }
  }
);

/**
 * PATCH /api/segments/:id
 * Update segment
 */
router.patch(
  '/:id',
  authenticate,
  authorize('edit:segments'),
  validate(updateSegmentSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const service = getSegmentService(req);

      const segment = await service.updateSegment(id, req.body);

      res.json({
        success: true,
        data: segment
      });
    } catch (error) {
      logger.logError('Error updating segment', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to update segment'
      });
    }
  }
);

/**
 * DELETE /api/segments/:id
 * Delete segment
 */
router.delete(
  '/:id',
  authenticate,
  authorize('delete:segments'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const service = getSegmentService(req);

      const deleted = await service.deleteSegment(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
      }

      res.json({
        success: true,
        message: 'Segment deleted'
      });
    } catch (error) {
      logger.logError('Error deleting segment', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete segment'
      });
    }
  }
);

/**
 * POST /api/segments/evaluate
 * Evaluate segment criteria (preview)
 */
router.post(
  '/evaluate',
  authenticate,
  authorize('view:segments'),
  validate(evaluateSegmentSchema),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const service = getSegmentService(req);

      const result = await service.evaluateSegment({
        segmentCriteria: req.body.criteria,
        filterLogic: req.body.filterLogic || 'AND',
        companyId
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.logError('Error evaluating segment', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to evaluate segment'
      });
    }
  }
);

/**
 * POST /api/segments/:id/refresh
 * Refresh segment members
 */
router.post(
  '/:id/refresh',
  authenticate,
  authorize('edit:segments'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId!;
      const service = getSegmentService(req);

      const segment = await service.getSegmentById(id);
      if (!segment) {
        return res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
      }

      const evalResult = await service.evaluateSegment({
        segmentCriteria: segment.criteria,
        filterLogic: segment.filterLogic,
        companyId
      });

      const result = await service.refreshSegmentMembers(id, evalResult.contactIds);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.logError('Error refreshing segment', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh segment'
      });
    }
  }
);

/**
 * GET /api/segments/:id/members
 * Get segment members
 */
router.get(
  '/:id/members',
  authenticate,
  authorize('view:segments'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const service = getSegmentService(req);

      const result = await service.getSegmentMembers(id, limit, offset);

      res.json({
        success: true,
        data: result.members,
        pagination: {
          limit,
          offset,
          total: result.total
        }
      });
    } catch (error) {
      logger.logError('Error fetching segment members', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch segment members'
      });
    }
  }
);

export default router;
