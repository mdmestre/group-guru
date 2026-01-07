/**
 * Pipeline Routes
 * API endpoints for pipeline management
 */

import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { PipelineService } from '../services/PipelineService';
import { z } from 'zod';
import { logger } from '@/utils/logger';

const router = Router();

// Validation schemas
const createPipelineSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional()
});

const updatePipelineSchema = createPipelineSchema.partial();

const createStageSchema = z.object({
  name: z.string().min(1).max(255),
  position: z.number().int().min(0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  description: z.string().optional(),
  conversionProbability: z.number().min(0).max(100).optional(),
  isDefault: z.boolean().optional()
});

const moveContactSchema = z.object({
  contactId: z.string().uuid(),
  fromStageId: z.string().uuid().optional(),
  toStageId: z.string().uuid(),
  notes: z.string().optional()
});

// Middleware to inject PipelineService
// @TODO: Inject DB connection from app context
const getPipelineService = (req: Request): PipelineService => {
  return new PipelineService(req.app.get('db'));
};

/**
 * GET /api/pipelines
 * Get all pipelines for company
 */
router.get(
  '/',
  authenticate,
  authorize('view:pipelines'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const pipelineService = getPipelineService(req);

      const pipelines = await pipelineService.getPipelines(companyId, {
        isActive: req.query.active !== 'false',
        search: req.query.search as string
      });

      res.json({
        success: true,
        data: pipelines,
        count: pipelines.length
      });
    } catch (error) {
      logger.logError('Error fetching pipelines', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pipelines'
      });
    }
  }
);

/**
 * GET /api/pipelines/:id
 * Get specific pipeline with stages
 */
router.get(
  '/:id',
  authenticate,
  authorize('view:pipelines'),
  async (req: Request, res: Response) => {
    try {
      const pipelineService = getPipelineService(req);
      const { id } = req.params;

      const pipeline = await pipelineService.getPipelineById(id);
      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: 'Pipeline not found'
        });
      }

      const stages = await pipelineService.getPipelineStages(id);

      res.json({
        success: true,
        data: {
          ...pipeline,
          stages
        }
      });
    } catch (error) {
      logger.logError('Error fetching pipeline', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pipeline'
      });
    }
  }
);

/**
 * POST /api/pipelines
 * Create new pipeline
 */
router.post(
  '/',
  authenticate,
  authorize('create:pipelines'),
  validate(createPipelineSchema),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const userId = req.user?.id!;
      const pipelineService = getPipelineService(req);

      const pipeline = await pipelineService.createPipeline(
        companyId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: pipeline
      });
    } catch (error) {
      logger.logError('Error creating pipeline', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to create pipeline'
      });
    }
  }
);

/**
 * PATCH /api/pipelines/:id
 * Update pipeline
 */
router.patch(
  '/:id',
  authenticate,
  authorize('edit:pipelines'),
  validate(updatePipelineSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pipelineService = getPipelineService(req);

      const pipeline = await pipelineService.updatePipeline(id, req.body);

      res.json({
        success: true,
        data: pipeline
      });
    } catch (error) {
      logger.logError('Error updating pipeline', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to update pipeline'
      });
    }
  }
);

/**
 * DELETE /api/pipelines/:id
 * Delete pipeline
 */
router.delete(
  '/:id',
  authenticate,
  authorize('delete:pipelines'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pipelineService = getPipelineService(req);

      const deleted = await pipelineService.deletePipeline(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Pipeline not found'
        });
      }

      res.json({
        success: true,
        message: 'Pipeline deleted'
      });
    } catch (error) {
      logger.logError('Error deleting pipeline', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete pipeline'
      });
    }
  }
);

/**
 * POST /api/pipelines/:id/stages
 * Create pipeline stage
 */
router.post(
  '/:id/stages',
  authenticate,
  authorize('create:pipelines'),
  validate(createStageSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pipelineService = getPipelineService(req);

      const stage = await pipelineService.createStage(id, req.body);

      res.status(201).json({
        success: true,
        data: stage
      });
    } catch (error) {
      logger.logError('Error creating pipeline stage', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to create pipeline stage'
      });
    }
  }
);

/**
 * GET /api/pipelines/:id/stages
 * Get pipeline stages
 */
router.get(
  '/:id/stages',
  authenticate,
  authorize('view:pipelines'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pipelineService = getPipelineService(req);

      const stages = await pipelineService.getPipelineStages(id);

      res.json({
        success: true,
        data: stages,
        count: stages.length
      });
    } catch (error) {
      logger.logError('Error fetching pipeline stages', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pipeline stages'
      });
    }
  }
);

/**
 * POST /api/pipelines/contacts/move
 * Move contact to pipeline stage
 */
router.post(
  '/contacts/move',
  authenticate,
  authorize('edit:pipelines'),
  validate(moveContactSchema),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const userId = req.user?.id!;
      const pipelineService = getPipelineService(req);

      const history = await pipelineService.moveContactToStage(
        companyId,
        userId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.logError('Error moving contact', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to move contact'
      });
    }
  }
);

/**
 * GET /api/pipelines/contacts/:contactId/history
 * Get contact pipeline history
 */
router.get(
  '/contacts/:contactId/history',
  authenticate,
  authorize('view:pipelines'),
  async (req: Request, res: Response) => {
    try {
      const { contactId } = req.params;
      const pipelineService = getPipelineService(req);

      const history = await pipelineService.getContactPipelineHistory(contactId);

      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error) {
      logger.logError('Error fetching pipeline history', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pipeline history'
      });
    }
  }
);

/**
 * GET /api/pipelines/stages/:stageId/stats
 * Get stage statistics
 */
router.get(
  '/stages/:stageId/stats',
  authenticate,
  authorize('view:pipelines'),
  async (req: Request, res: Response) => {
    try {
      const { stageId } = req.params;
      const pipelineService = getPipelineService(req);

      const stats = await pipelineService.getStageStats(stageId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.logError('Error fetching stage stats', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stage statistics'
      });
    }
  }
);

export default router;
