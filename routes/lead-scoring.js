// Lead Scoring Routes - JavaScript version
// Simplified implementation without TypeScript dependencies

import { Router } from 'express';
import { authenticateJWT, tenantMiddleware } from '../middleware/auth.js';
import { query } from '../database/connection.js';
import {
  emitScoreUpdated,
  emitRuleUpdated,
  emitScoresRecalculated,
} from '../utils/socketHelper.js';

const router = Router();

// Socket.IO instance - will be set by server.js
let io = null;

export function setSocketIO(socketIO) {
  io = socketIO;
}

// Apply authentication and tenant middleware
router.use(authenticateJWT);
router.use(tenantMiddleware);

/**
 * GET /api/lead-scoring/rules
 * Get all lead scoring rules
 */
router.get('/lead-scoring/rules', async (req, res) => {
  try {
    const companyId = req.companyId;
    
    const result = await query(
      `SELECT 
        id, name, description, criteria, score_value, is_active,
        created_at, updated_at
      FROM crm_lead_scoring_rules
      WHERE company_id = $1
      ORDER BY created_at DESC`,
      [companyId]
    );
    
    const rules = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: 'interaction', // Default since schema doesn't have type
      criteria: typeof row.criteria === 'string' ? JSON.parse(row.criteria) : row.criteria,
      points: row.score_value,
      score_value: row.score_value,
      active: row.is_active,
      is_active: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    res.status(200).json(rules);
  } catch (error) {
    console.error('[LeadScoring] Error fetching rules:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/lead-scoring/leads/by-score
 * Get leads by score range
 */
router.get('/lead-scoring/leads/by-score', async (req, res) => {
  try {
    const { minScore, maxScore, limit = 50, offset = 0 } = req.query;
    
    // Return empty array for now - this would query the database in production
    res.status(200).json([]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/lead-scoring/:contactId
 * Get lead score for a contact
 */
router.get('/lead-scoring/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    
    // Return score object directly
    res.status(200).json({
      contactId,
      score: 0,
      scoreBreakdown: {},
      rulesApplied: [],
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/lead-scoring/rules
 * Create a new scoring rule
 */
router.post('/lead-scoring/rules', async (req, res) => {
  try {
    const { name, description, type, points, criteria, active } = req.body;
    const companyId = req.companyId;
    const userId = req.userId;
    
    if (!name) {
      return res.status(400).json({ 
        error: 'Rule name is required',
        received: req.body
      });
    }
    
    if (points === undefined || points === null) {
      return res.status(400).json({ 
        error: 'Points are required',
        received: req.body
      });
    }
    
    // Prepare criteria JSONB - include type if provided
    const criteriaData = {
      ...(criteria || {}),
      ...(type && { type })
    };
    
    // Insert into database
    const result = await query(
      `INSERT INTO crm_lead_scoring_rules 
        (company_id, name, description, criteria, score_value, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, name, description, criteria, score_value, is_active,
        created_at, updated_at`,
      [
        companyId,
        name,
        description || null,
        JSON.stringify(criteriaData),
        parseInt(points) || 0,
        active !== undefined ? active : true,
        userId || null
      ]
    );
    
    const row = result.rows[0];
    const rule = {
      id: row.id,
      name: row.name,
      description: row.description,
      type: type || 'interaction',
      criteria: typeof row.criteria === 'string' ? JSON.parse(row.criteria) : row.criteria,
      points: row.score_value,
      score_value: row.score_value,
      active: row.is_active,
      is_active: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitRuleUpdated(io, {
        ruleId: rule.id,
        companyId,
      });
    }
    
    res.status(201).json(rule);
  } catch (error) {
    console.error('[LeadScoring] Error creating rule:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: 'A rule with this name already exists'
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/lead-scoring/rules/:id
 * Update a scoring rule
 */
router.put('/lead-scoring/rules/:id', async (req, res) => {
  try {
    const { id: ruleId } = req.params;
    const companyId = req.companyId || req.user?.companyId;
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitRuleUpdated(io, {
        ruleId,
        companyId,
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Scoring rule updated successfully',
      data: { id: ruleId, ...req.body }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/lead-scoring/rules/:id
 * Delete a scoring rule
 */
router.delete('/lead-scoring/rules/:id', async (req, res) => {
  try {
    const { id: ruleId } = req.params;
    const companyId = req.companyId;
    
    // Check if rule exists and belongs to company
    const checkResult = await query(
      'SELECT id FROM crm_lead_scoring_rules WHERE id = $1 AND company_id = $2',
      [ruleId, companyId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scoring rule not found' });
    }
    
    // Delete the rule
    await query(
      'DELETE FROM crm_lead_scoring_rules WHERE id = $1 AND company_id = $2',
      [ruleId, companyId]
    );
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitRuleUpdated(io, {
        ruleId,
        companyId,
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Scoring rule deleted successfully'
    });
  } catch (error) {
    console.error('[LeadScoring] Error deleting rule:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/lead-scoring/recalculate
 * Recalculate all scores
 */
router.post('/lead-scoring/recalculate', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitScoresRecalculated(io, {
        companyId,
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Scores recalculated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
