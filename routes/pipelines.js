// Pipeline Routes - JavaScript version
// Simplified implementation without TypeScript dependencies

import { Router } from 'express';
import {
  emitPipelineUpdated,
  emitStageUpdated,
  emitContactMoved,
} from '../utils/socketHelper.js';

const router = Router();

// Socket.IO instance - will be set by server.js
let io = null;

export function setSocketIO(socketIO) {
  io = socketIO;
}

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  
  try {
    // Token validation would happen here
    // For now, assume it's valid
    req.authenticated = true;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * GET /api/pipelines
 * Get all pipelines for company
 */
router.get('/pipelines', authenticateJWT, async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      message: 'Pipeline routes loaded successfully',
      data: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pipelines
 * Create a new pipeline
 */
router.post('/pipelines', authenticateJWT, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    const companyId = req.companyId || req.user?.companyId;
    
    if (!name) {
      return res.status(400).json({ error: 'Pipeline name is required' });
    }
    
    const pipeline = {
      id: 'uuid-placeholder',
      name,
      description,
      color,
      icon
    };
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitPipelineUpdated(io, {
        pipelineId: pipeline.id,
        companyId,
      });
    }
    
    res.status(201).json({
      status: 'success',
      message: 'Pipeline created successfully',
      data: pipeline
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/pipelines/:id
 * Update a pipeline
 */
router.put('/pipelines/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId || req.user?.companyId;
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitPipelineUpdated(io, {
        pipelineId: id,
        companyId,
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Pipeline updated successfully',
      data: { id, ...req.body }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pipelines/:id/stages
 * Create a new stage
 */
router.post('/pipelines/:id/stages', authenticateJWT, async (req, res) => {
  try {
    const { id: pipelineId } = req.params;
    const companyId = req.companyId || req.user?.companyId;
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitStageUpdated(io, {
        pipelineId,
        stageId: req.body.id,
        companyId,
      });
    }
    
    res.status(201).json({
      status: 'success',
      message: 'Stage created successfully',
      data: req.body
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pipelines/:id/contacts/:contactId/move
 * Move contact to a stage
 */
router.post('/pipelines/:id/contacts/:contactId/move', authenticateJWT, async (req, res) => {
  try {
    const { id: pipelineId, contactId } = req.params;
    const { stageId, fromStageId } = req.body;
    const companyId = req.companyId || req.user?.companyId;
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitContactMoved(io, {
        pipelineId,
        contactId,
        stageId,
        fromStageId,
        companyId,
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Contact moved successfully',
      data: { pipelineId, contactId, stageId }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
