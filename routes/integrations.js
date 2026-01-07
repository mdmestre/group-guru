/**
 * Integrations Routes
 * Phase 4: Multi-channel and external integrations
 */

import express from 'express';
import { authenticate, requireCompanyContext } from '../middleware/auth.js';
import { query } from '../database/connection.js';
import contextManager from '../core/context/ContextManager.js';

const router = express.Router();

// Services - TODO: Convert to ES Modules
// Temporarily disabled until services are converted from CommonJS to ES Modules
// import TelegramService from '../core/integrations/TelegramService.js';
// import SMSService from '../core/integrations/SMSService.js';
// import EmailService from '../core/integrations/EmailService.js';
// import WebhookService from '../core/integrations/WebhookService.js';

// const telegramService = new TelegramService();
// const smsService = new SMSService();
// const emailService = new EmailService();
// const webhookService = new WebhookService();

// ============================================
// CHANNEL CONNECTIONS
// ============================================

/**
 * List all channel connections
 */
router.get('/channels', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();
    
    const result = await query(
      `SELECT * FROM channel_connections 
       WHERE company_id = $1 
       ORDER BY created_at DESC`,
      [companyId]
    );

    res.json({ success: true, connections: result.rows });
  } catch (error) {
    console.error('[Integrations] Error listing channels:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create channel connection
 */
router.post('/channels', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();
    const { channelType, name, credentials, config } = req.body;

    const result = await query(
      `INSERT INTO channel_connections (
        company_id, channel_type, name, credentials, config, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [companyId, channelType, name, JSON.stringify(credentials || {}), JSON.stringify(config || {}), req.user.id]
    );

    const connection = result.rows[0];

    // Initialize service based on channel type
    // TODO: Uncomment when services are converted to ES Modules
    /*
    try {
      switch (channelType) {
        case 'telegram':
          if (credentials.botToken) {
            await telegramService.initializeBot(companyId, credentials.botToken);
          }
          break;
        case 'sms':
          if (credentials.accountSid && credentials.authToken && credentials.phoneNumber) {
            await smsService.initializeClient(companyId, credentials.accountSid, credentials.authToken, credentials.phoneNumber);
          }
          break;
        case 'email':
          if (credentials.apiKey) {
            await emailService.initializeClient(companyId, credentials.apiKey);
          }
          break;
      }
    } catch (initError) {
      console.error(`[Integrations] Error initializing ${channelType}:`, initError);
      // Continue - connection created but needs retry
    }
    */

    res.json({ success: true, connection });
  } catch (error) {
    console.error('[Integrations] Error creating channel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update channel connection
 */
router.patch('/channels/:id', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();
    const { id } = req.params;
    const { name, credentials, config, is_active } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (credentials !== undefined) {
      updates.push(`credentials = $${paramCount++}`);
      values.push(JSON.stringify(credentials));
    }
    if (config !== undefined) {
      updates.push(`config = $${paramCount++}`);
      values.push(JSON.stringify(config));
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, companyId);

    const result = await query(
      `UPDATE channel_connections 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND company_id = $${paramCount++}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    res.json({ success: true, connection: result.rows[0] });
  } catch (error) {
    console.error('[Integrations] Error updating channel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete channel connection
 */
router.delete('/channels/:id', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();
    const { id } = req.params;

    // Get connection to check channel type
    const connResult = await query(
      `SELECT channel_type FROM channel_connections WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (connResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    const channelType = connResult.rows[0].channel_type;

    // Disconnect service
    // TODO: Uncomment when services are converted to ES Modules
    /*
    try {
      switch (channelType) {
        case 'telegram':
          await telegramService.disconnectBot(companyId);
          break;
      }
    } catch (disconnectError) {
      console.error(`[Integrations] Error disconnecting ${channelType}:`, disconnectError);
    }
    */

    // Delete connection
    await query(
      `DELETE FROM channel_connections WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[Integrations] Error deleting channel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send message via channel
 */
router.post('/channels/:id/send', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();
    const { id } = req.params;
    const { to, content, options } = req.body;

    // Get connection
    const connResult = await query(
      `SELECT * FROM channel_connections WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (connResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    const connection = connResult.rows[0];

    // TODO: Uncomment when services are converted to ES Modules
    return res.status(501).json({ 
      success: false, 
      error: 'Service integration pending - services need to be converted to ES Modules' 
    });

    /*
    let result;
    switch (connection.channel_type) {
      case 'telegram':
        result = await telegramService.sendMessage(companyId, to, content, options || {});
        break;
      case 'sms':
        result = await smsService.sendSMS(companyId, to, content, options || {});
        break;
      case 'email':
        result = await emailService.sendEmail(companyId, to, req.body.subject || 'No Subject', content, options || {});
        break;
      default:
        return res.status(400).json({ success: false, error: 'Channel type not supported for sending' });
    }

    res.json({ success: true, ...result });
    */
  } catch (error) {
    console.error('[Integrations] Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// WEBHOOKS
// ============================================

/**
 * List webhooks
 */
router.get('/webhooks', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();

    const result = await query(
      `SELECT * FROM webhooks 
       WHERE company_id = $1 
       ORDER BY created_at DESC`,
      [companyId]
    );

    res.json({ success: true, webhooks: result.rows });
  } catch (error) {
    console.error('[Integrations] Error listing webhooks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create webhook
 */
router.post('/webhooks', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();
    const { name, url, eventTypes, authType, authCredentials, customHeaders, timeoutMs, retryCount } = req.body;

    const result = await query(
      `INSERT INTO webhooks (
        company_id, name, url, event_types, auth_type, auth_credentials,
        custom_headers, timeout_ms, retry_count, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        companyId,
        name,
        url,
        eventTypes,
        authType || 'none',
        JSON.stringify(authCredentials || {}),
        JSON.stringify(customHeaders || {}),
        timeoutMs || 5000,
        retryCount || 3,
        req.user.id
      ]
    );

    res.json({ success: true, webhook: result.rows[0] });
  } catch (error) {
    console.error('[Integrations] Error creating webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update webhook
 */
router.patch('/webhooks/:id', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();
    const { id } = req.params;
    const updates = req.body;

    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.url !== undefined) {
      setClauses.push(`url = $${paramCount++}`);
      values.push(updates.url);
    }
    if (updates.eventTypes !== undefined) {
      setClauses.push(`event_types = $${paramCount++}`);
      values.push(updates.eventTypes);
    }
    if (updates.is_active !== undefined) {
      setClauses.push(`is_active = $${paramCount++}`);
      values.push(updates.is_active);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id, companyId);

    const result = await query(
      `UPDATE webhooks 
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount++} AND company_id = $${paramCount++}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }

    res.json({ success: true, webhook: result.rows[0] });
  } catch (error) {
    console.error('[Integrations] Error updating webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete webhook
 */
router.delete('/webhooks/:id', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();
    const { id } = req.params;

    await query(
      `DELETE FROM webhooks WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[Integrations] Error deleting webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get webhook executions (logs)
 */
router.get('/webhooks/:id/executions', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();
    const { id } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const result = await query(
      `SELECT * FROM webhook_executions 
       WHERE webhook_id = $1 AND company_id = $2
       ORDER BY started_at DESC
       LIMIT $3 OFFSET $4`,
      [id, companyId, limit, offset]
    );

    res.json({ success: true, executions: result.rows });
  } catch (error) {
    console.error('[Integrations] Error getting webhook executions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// EXTERNAL INTEGRATIONS
// ============================================

/**
 * List external integrations
 */
router.get('/external', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();

    const result = await query(
      `SELECT * FROM external_integrations 
       WHERE company_id = $1 
       ORDER BY created_at DESC`,
      [companyId]
    );

    res.json({ success: true, integrations: result.rows });
  } catch (error) {
    console.error('[Integrations] Error listing integrations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create external integration
 */
router.post('/external', authenticate, requireCompanyContext, async (req, res) => {
  try {
    const companyId = contextManager.getCompanyId();
    const { integrationType, name, credentials, config, webhookUrl, apiKey } = req.body;

    const result = await query(
      `INSERT INTO external_integrations (
        company_id, integration_type, name, credentials, config, webhook_url, api_key, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        companyId,
        integrationType,
        name,
        JSON.stringify(credentials || {}),
        JSON.stringify(config || {}),
        webhookUrl || null,
        apiKey || null,
        req.user.id
      ]
    );

    res.json({ success: true, integration: result.rows[0] });
  } catch (error) {
    console.error('[Integrations] Error creating integration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
