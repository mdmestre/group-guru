/**
 * Campaign Routes
 * 
 * Endpoints for managing campaigns and dispatches
 * - Create campaign
 * - List campaigns
 * - Get campaign details
 * - Launch campaign
 * - Pause/Resume campaign
 * - Cancel campaign
 * - Get campaign stats
 * - Get campaign recipients
 */

import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { CampaignRepository } from '../database/repositories/CampaignRepository.js';
import { TemplateRepository } from '../database/repositories/TemplateRepository.js';
import { DispatchService } from '../services/DispatchService.js';
import { MessageQueueService } from '../services/MessageQueueService.js';

const router = express.Router();

// Middleware to ensure user is authenticated
router.use(authenticateJWT);

/**
 * POST /campaigns
 * Create a new campaign
 */
router.post('/', async (req, res) => {
  try {
    const { companyId } = req;
    const {
      name,
      description,
      type,
      messageTemplate,
      mediaUrl,
      mediaType,
      targetFilters,
      messagesPerMinute,
      delayBetweenMessages,
      connectionId
    } = req.body;

    // Validation
    if (!name || !messageTemplate) {
      return res.status(400).json({
        error: 'name and messageTemplate are required'
      });
    }

    // Create campaign
    const campaign = await CampaignRepository.create({
      companyId,
      name,
      description,
      type: type || 'broadcast',
      messageTemplate,
      mediaUrl,
      mediaType,
      targetFilters: targetFilters || {},
      messagesPerMinute: messagesPerMinute || 10,
      delayBetweenMessages: delayBetweenMessages || 6000,
      connectionId,
      createdBy: req.userId
    });

    res.status(201).json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error creating campaign:', error);
    res.status(500).json({
      error: error.message || 'Failed to create campaign'
    });
  }
});

/**
 * GET /campaigns
 * List campaigns for company
 */
router.get('/', async (req, res) => {
  try {
    const { companyId } = req;
    const { status, limit = 50, offset = 0 } = req.query;

    const campaigns = await CampaignRepository.findByCompanyId(companyId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      campaigns,
      count: campaigns.length
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error listing campaigns:', error);
    res.status(500).json({
      error: error.message || 'Failed to list campaigns'
    });
  }
});

// ============================================
// TEMPLATES ENDPOINTS (MUST BE BEFORE DYNAMIC ROUTES)
// ============================================

/**
 * POST /campaigns/templates
 * Create new template
 */
router.post('/templates', async (req, res) => {
  try {
    const { companyId } = req;
    const { name, content, variables } = req.body;

    // Validation
    if (!name || !content) {
      return res.status(400).json({
        error: 'name and content are required'
      });
    }

    const template = await TemplateRepository.create({
      companyId,
      name,
      content,
      variables: variables || [],
      createdBy: req.userId
    });

    res.status(201).json({
      success: true,
      template
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error creating template:', error);
    res.status(500).json({
      error: error.message || 'Failed to create template'
    });
  }
});

/**
 * GET /campaigns/templates
 * List all templates for company
 */
router.get('/templates', async (req, res) => {
  try {
    const { companyId } = req;
    const { limit = 50, offset = 0 } = req.query;

    const templates = await TemplateRepository.findByCompanyId(companyId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      templates,
      count: templates.length
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error listing templates:', error);
    res.status(500).json({
      error: error.message || 'Failed to list templates'
    });
  }
});

/**
 * GET /campaigns/templates/:templateId
 * Get template details
 */
router.get('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await TemplateRepository.findById(templateId);
    if (!template) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error getting template:', error);
    res.status(500).json({
      error: error.message || 'Failed to get template'
    });
  }
});

/**
 * PATCH /campaigns/templates/:templateId
 * Update template
 */
router.patch('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name, content, variables } = req.body;

    const template = await TemplateRepository.update(templateId, {
      name,
      content,
      variables
    });

    if (!template) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error updating template:', error);
    res.status(500).json({
      error: error.message || 'Failed to update template'
    });
  }
});

/**
 * DELETE /campaigns/templates/:templateId
 * Delete template (soft delete)
 */
router.delete('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await TemplateRepository.delete(templateId);
    if (!template) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error deleting template:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete template'
    });
  }
});

// ============================================
// CAMPAIGNS DYNAMIC ENDPOINTS
// ============================================

/**
 * GET /campaigns/:campaignId
 * Get campaign details
 */
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await CampaignRepository.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error getting campaign:', error);
    res.status(500).json({
      error: error.message || 'Failed to get campaign'
    });
  }
});

/**
 * POST /campaigns/:campaignId/recipients
 * Add recipients to campaign
 */
router.post('/:campaignId/recipients', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { contactIds } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        error: 'contactIds array is required'
      });
    }

    const recipients = await CampaignRepository.addRecipients(campaignId, contactIds);

    res.status(201).json({
      success: true,
      recipients,
      count: recipients.length
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error adding recipients:', error);
    res.status(500).json({
      error: error.message || 'Failed to add recipients'
    });
  }
});

/**
 * GET /campaigns/:campaignId/recipients
 * Get campaign recipients with status
 */
router.get('/:campaignId/recipients', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status, limit = 100, offset = 0 } = req.query;

    const recipients = await CampaignRepository.getRecipients(campaignId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      recipients,
      count: recipients.length
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error getting recipients:', error);
    res.status(500).json({
      error: error.message || 'Failed to get recipients'
    });
  }
});

/**
 * POST /campaigns/:campaignId/launch
 * Launch campaign (add to message queue)
 */
router.post('/:campaignId/launch', async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Initialize queue if needed
    const queue = await MessageQueueService.initializeQueue();

    // Launch campaign
    const result = await DispatchService.launchCampaign(campaignId);

    res.json({
      success: true,
      campaign: result.campaign,
      jobsQueued: result.jobsQueued,
      recipientCount: result.recipientCount
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error launching campaign:', error);
    res.status(500).json({
      error: error.message || 'Failed to launch campaign'
    });
  }
});

/**
 * POST /campaigns/:campaignId/pause
 * Pause campaign
 */
router.post('/:campaignId/pause', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await DispatchService.pauseCampaign(campaignId);

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error pausing campaign:', error);
    res.status(500).json({
      error: error.message || 'Failed to pause campaign'
    });
  }
});

/**
 * POST /campaigns/:campaignId/resume
 * Resume campaign
 */
router.post('/:campaignId/resume', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await DispatchService.resumeCampaign(campaignId);

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error resuming campaign:', error);
    res.status(500).json({
      error: error.message || 'Failed to resume campaign'
    });
  }
});

/**
 * POST /campaigns/:campaignId/cancel
 * Cancel campaign
 */
router.post('/:campaignId/cancel', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await DispatchService.cancelCampaign(campaignId);

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error canceling campaign:', error);
    res.status(500).json({
      error: error.message || 'Failed to cancel campaign'
    });
  }
});

/**
 * GET /campaigns/:campaignId/stats
 * Get campaign statistics
 */
router.get('/:campaignId/stats', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const stats = await DispatchService.getCampaignStats(campaignId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error getting stats:', error);
    res.status(500).json({
      error: error.message || 'Failed to get campaign stats'
    });
  }
});

/**
 * GET /campaigns/queue/stats
 * Get message queue statistics
 */
router.get('/queue/stats', async (req, res) => {
  try {
    const queue = await MessageQueueService.initializeQueue();
    const stats = await MessageQueueService.getQueueStats();

    res.json({
      success: true,
      queue: stats
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error getting queue stats:', error);
    res.status(500).json({
      error: error.message || 'Failed to get queue stats'
    });
  }
});

/**
 * DELETE /campaigns/:campaignId
 * Delete campaign (soft delete)
 */
router.delete('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await CampaignRepository.delete(campaignId);
    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('[CampaignRoutes] Error deleting campaign:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete campaign'
    });
  }
});

export default router;
