/**
 * Automation Routes
 * API endpoints for automation management
 * Phase 3: Intelligent Automations
 */

import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { AutomationService } from '../services/AutomationService';
import { z } from 'zod';
import { logger } from '@/utils/logger';

const router = Router();

// Validation schemas
const createAutomationSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  flowDefinition: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any())
  }),
  triggerType: z.enum([
    'message_received',
    'contact_created',
    'field_changed',
    'tag_added',
    'stage_changed',
    'webhook',
    'schedule',
    'manual_trigger'
  ]),
  triggerConfig: z.record(z.any()),
  isActive: z.boolean().optional()
});

const updateAutomationSchema = createAutomationSchema.partial();

const testAutomationSchema = z.object({
  automationId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  triggerData: z.record(z.any()).optional(),
  dryRun: z.boolean().optional()
});

// Middleware to inject AutomationService
const getAutomationService = (req: Request): AutomationService => {
  return new AutomationService(req.app.get('db'));
};

/**
 * GET /api/automations
 * Get all automations for company
 */
router.get(
  '/automations',
  authenticate,
  authorize('view:automations'),
  async (req: Request, res: Response) => {
    try {
      const service = getAutomationService(req);
      const companyId = req.user!.companyId;
      const automations = await service.getAutomations(companyId);
      res.json(automations);
    } catch (error: any) {
      logger.logError('Error fetching automations', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/automations/:id
 * Get a single automation
 */
router.get(
  '/automations/:id',
  authenticate,
  authorize('view:automations'),
  async (req: Request, res: Response) => {
    try {
      const service = getAutomationService(req);
      const companyId = req.user!.companyId;
      const automation = await service.getAutomationById(
        companyId,
        req.params.id
      );

      if (!automation) {
        return res.status(404).json({ error: 'Automation not found' });
      }

      res.json(automation);
    } catch (error: any) {
      logger.logError('Error fetching automation', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/automations
 * Create a new automation
 */
router.post(
  '/automations',
  authenticate,
  authorize('create:automations'),
  validate(createAutomationSchema),
  async (req: Request, res: Response) => {
    try {
      const service = getAutomationService(req);
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const automation = await service.createAutomation(
        companyId,
        userId,
        req.body
      );

      res.status(201).json(automation);
    } catch (error: any) {
      logger.logError('Error creating automation', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PATCH /api/automations/:id
 * Update an automation
 */
router.patch(
  '/automations/:id',
  authenticate,
  authorize('edit:automations'),
  validate(updateAutomationSchema),
  async (req: Request, res: Response) => {
    try {
      const service = getAutomationService(req);
      const companyId = req.user!.companyId;

      const automation = await service.updateAutomation(
        companyId,
        req.params.id,
        req.body
      );

      res.json(automation);
    } catch (error: any) {
      logger.logError('Error updating automation', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/automations/:id
 * Delete an automation
 */
router.delete(
  '/automations/:id',
  authenticate,
  authorize('delete:automations'),
  async (req: Request, res: Response) => {
    try {
      const service = getAutomationService(req);
      const companyId = req.user!.companyId;

      await service.deleteAutomation(companyId, req.params.id);

      res.status(204).send();
    } catch (error: any) {
      logger.logError('Error deleting automation', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/automations/:id/runs
 * Get automation runs
 */
router.get(
  '/automations/:id/runs',
  authenticate,
  authorize('view:automations'),
  async (req: Request, res: Response) => {
    try {
      const service = getAutomationService(req);
      const companyId = req.user!.companyId;
      const limit = parseInt(req.query.limit as string) || 50;

      const runs = await service.getAutomationRuns(
        companyId,
        req.params.id,
        limit
      );

      res.json(runs);
    } catch (error: any) {
      logger.logError('Error fetching automation runs', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/automations/runs/:runId/logs
 * Get automation logs for a run
 */
router.get(
  '/automations/runs/:runId/logs',
  authenticate,
  authorize('view:automations'),
  async (req: Request, res: Response) => {
    try {
      const service = getAutomationService(req);
      const companyId = req.user!.companyId;

      const logs = await service.getAutomationLogs(
        companyId,
        req.params.runId
      );

      res.json(logs);
    } catch (error: any) {
      logger.logError('Error fetching automation logs', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/automations/:id/test
 * Test an automation (dry-run or actual execution)
 */
router.post(
  '/automations/:id/test',
  authenticate,
  authorize('edit:automations'),
  validate(testAutomationSchema),
  async (req: Request, res: Response) => {
    try {
      const service = getAutomationService(req);
      const companyId = req.user!.companyId;

      const result = await service.testAutomation(companyId, {
        automationId: req.params.id,
        ...req.body
      });

      res.json(result);
    } catch (error: any) {
      logger.logError('Error testing automation', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;

