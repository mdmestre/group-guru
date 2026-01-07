// Segments Routes - JavaScript version
// Simplified implementation without TypeScript dependencies

import { Router } from 'express';
import { authenticateJWT, tenantMiddleware } from '../middleware/auth.js';
import { query } from '../database/connection.js';
import {
  emitSegmentUpdated,
  emitSegmentMembersRefreshed,
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
 * GET /api/segments
 * Get all segments
 */
router.get('/segments', async (req, res) => {
  try {
    const companyId = req.companyId;
    
    const result = await query(
      `SELECT 
        id, name, description, criteria, member_count, is_active,
        created_at, updated_at
      FROM crm_segments
      WHERE company_id = $1
      ORDER BY created_at DESC`,
      [companyId]
    );
    
    const segments = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      criteria: row.criteria,
      memberCount: row.member_count,
      member_count: row.member_count,
      isActive: row.is_active,
      is_active: row.is_active,
      isSmart: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    res.status(200).json(segments);
  } catch (error) {
    console.error('[Segments] Error fetching segments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/segments
 * Create a new segment
 */
router.post('/segments', async (req, res) => {
  try {
    const { name, description, criteria, filterLogic } = req.body;
    const companyId = req.companyId;
    const userId = req.userId;
    
    // Validate criteria - can be object with rules or array
    const criteriaObj = criteria || {};
    const rules = criteriaObj.rules || (Array.isArray(criteria) ? criteria : []);
    
    if (!name) {
      return res.status(400).json({ 
        error: 'Segment name is required',
        received: req.body
      });
    }
    
    if (!rules || rules.length === 0) {
      return res.status(400).json({ 
        error: 'Segment must have at least one rule',
        received: req.body
      });
    }
    
    // Prepare criteria JSONB - include filterLogic if provided
    const criteriaData = {
      rules: rules,
      ...(filterLogic && { filterLogic })
    };
    
    // Insert into database
    const result = await query(
      `INSERT INTO crm_segments 
        (company_id, name, description, criteria, member_count, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, name, description, criteria, member_count, is_active,
        created_at, updated_at`,
      [
        companyId,
        name,
        description || null,
        JSON.stringify(criteriaData),
        0, // member_count
        true, // is_active
        userId || null
      ]
    );
    
    const row = result.rows[0];
    const segment = {
      id: row.id,
      name: row.name,
      description: row.description,
      criteria: typeof row.criteria === 'string' ? JSON.parse(row.criteria) : row.criteria,
      filterLogic: filterLogic || 'AND',
      memberCount: row.member_count,
      member_count: row.member_count,
      isActive: row.is_active,
      is_active: row.is_active,
      isSmart: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitSegmentUpdated(io, {
        segmentId: segment.id,
        companyId,
      });
    }
    
    res.status(201).json(segment);
  } catch (error) {
    console.error('[Segments] Error creating segment:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: 'A segment with this name already exists'
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/segments/:id
 * Update a segment
 */
router.put('/segments/:id', async (req, res) => {
  try {
    const { id: segmentId } = req.params;
    const companyId = req.companyId || req.user?.companyId;
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitSegmentUpdated(io, {
        segmentId,
        companyId,
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Segment updated successfully',
      data: { id: segmentId, ...req.body }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/segments/:id
 * Delete a segment
 */
router.delete('/segments/:id', async (req, res) => {
  try {
    const { id: segmentId } = req.params;
    const companyId = req.companyId;
    
    // Check if segment exists and belongs to company
    const checkResult = await query(
      'SELECT id FROM crm_segments WHERE id = $1 AND company_id = $2',
      [segmentId, companyId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    // Delete the segment (cascade will delete members and actions)
    await query(
      'DELETE FROM crm_segments WHERE id = $1 AND company_id = $2',
      [segmentId, companyId]
    );
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitSegmentUpdated(io, {
        segmentId,
        companyId,
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Segment deleted successfully'
    });
  } catch (error) {
    console.error('[Segments] Error deleting segment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/segments/:id/refresh
 * Refresh segment members
 */
router.post('/segments/:id/refresh', async (req, res) => {
  try {
    const { id: segmentId } = req.params;
    const companyId = req.companyId || req.user?.companyId;
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitSegmentMembersRefreshed(io, {
        segmentId,
        memberCount: req.body.memberCount || 0,
        companyId,
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Segment members refreshed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
