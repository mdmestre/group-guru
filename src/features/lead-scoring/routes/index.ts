/**
 * Lead Scoring Routes
 * API endpoints for lead scoring
 */

import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { LeadScoringService } from '../services/LeadScoringService';
import { z } from 'zod';
import { logger } from '@/utils/logger';

const router = Router();

// Validation schemas
const createScoringRuleSchema = z.object({
  name: z.string().min(1).max(255),
  ruleType: z.enum(['interaction', 'field_value', 'engagement', 'custom']),
  condition: z.object({
    field: z.string().optional(),
    operator: z.string().optional(),
    value: z.any().optional(),
    eventType: z.string().optional(),
    metric: z.string().optional(),
    threshold: z.number().optional()
  }),
  points: z.number().int().min(1).max(1000)
});

const getLeadsSchema = z.object({
  minScore: z.number().int().min(0).default(0),
  maxScore: z.number().int().max(10000).default(10000),
  limit: z.number().int().min(1).max(1000).default(50)
});

// Middleware to inject LeadScoringService
const getLeadScoringService = (req: Request): LeadScoringService => {
  return new LeadScoringService(req.app.get('db'));
};

/**
 * POST /api/lead-scoring/calculate/:contactId
 * Calculate/recalculate lead score for a contact
 */
router.post(
  '/calculate/:contactId',
  authenticate,
  authorize('view:lead-scoring'),
  async (req: Request, res: Response) => {
    try {
      const { contactId } = req.params;
      const companyId = req.user?.companyId!;
      const service = getLeadScoringService(req);

      const scoreResult = await service.calculateLeadScore(contactId, companyId);
      const updatedScore = await service.updateLeadScore(contactId, companyId, scoreResult);

      res.json({
        success: true,
        data: {
          score: updatedScore,
          calculation: scoreResult
        }
      });
    } catch (error) {
      logger.logError('Error calculating lead score', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate lead score'
      });
    }
  }
);

/**
 * GET /api/lead-scoring/:contactId
 * Get lead score for a contact
 */
router.get(
  '/:contactId',
  authenticate,
  authorize('view:lead-scoring'),
  async (req: Request, res: Response) => {
    try {
      const { contactId } = req.params;
      const service = getLeadScoringService(req);

      const score = await service.getLeadScore(contactId);
      if (!score) {
        return res.status(404).json({
          success: false,
          error: 'Lead score not found'
        });
      }

      res.json({
        success: true,
        data: score
      });
    } catch (error) {
      logger.logError('Error fetching lead score', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch lead score'
      });
    }
  }
);

/**
 * POST /api/lead-scoring/rules
 * Create custom scoring rule
 */
router.post(
  '/rules',
  authenticate,
  authorize('create:lead-scoring'),
  validate(createScoringRuleSchema),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const service = getLeadScoringService(req);

      const rule = await service.createScoringRule(companyId, req.body);

      res.status(201).json({
        success: true,
        data: rule
      });
    } catch (error) {
      logger.logError('Error creating scoring rule', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to create scoring rule'
      });
    }
  }
);

/**
 * GET /api/lead-scoring/rules
 * Get all active scoring rules
 */
router.get(
  '/rules',
  authenticate,
  authorize('view:lead-scoring'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const service = getLeadScoringService(req);

      const rules = await service.getActiveRules(companyId);

      res.json({
        success: true,
        data: rules,
        count: rules.length
      });
    } catch (error) {
      logger.logError('Error fetching scoring rules', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch scoring rules'
      });
    }
  }
);

/**
 * GET /api/lead-scoring/leads/by-score
 * Get leads filtered by score range
 */
router.get(
  '/leads/by-score',
  authenticate,
  authorize('view:lead-scoring'),
  validate(getLeadsSchema),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const { minScore, maxScore, limit } = req.body;
      const service = getLeadScoringService(req);

      const leads = await service.getLeadsByScoreRange(
        companyId,
        minScore,
        maxScore,
        limit
      );

      res.json({
        success: true,
        data: leads,
        count: leads.length
      });
    } catch (error) {
      logger.logError('Error fetching leads by score', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch leads by score'
      });
    }
  }
);

/**
 * POST /api/lead-scoring/recalculate-all
 * Recalculate all lead scores for company
 */
router.post(
  '/recalculate-all',
  authenticate,
  authorize('edit:lead-scoring'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const service = getLeadScoringService(req);

      const result = await service.recalculateAllScores(companyId);

      res.json({
        success: true,
        data: result,
        message: `Successfully recalculated ${result.processed} lead scores`
      });
    } catch (error) {
      logger.logError('Error recalculating all scores', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to recalculate scores'
      });
    }
  }
);

export default router;
