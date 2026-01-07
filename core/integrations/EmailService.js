/**
 * Email Integration Service (SendGrid)
 * Phase 4: Multi-channel support
 */

const sgMail = require('@sendgrid/mail');
const { query } = require('../database');

class EmailService {
  constructor() {
    this.clients = new Map(); // companyId -> SendGrid API key
  }

  /**
   * Initialize SendGrid client for a company
   */
  async initializeClient(companyId, apiKey) {
    try {
      sgMail.setApiKey(apiKey);
      this.clients.set(companyId, apiKey);

      // Update connection status
      await query(
        `UPDATE channel_connections 
         SET status = 'connected', error_message = NULL, last_activity_at = NOW()
         WHERE company_id = $1 AND channel_type = 'email'`,
        [companyId]
      );

      return { success: true };
    } catch (error) {
      console.error(`[EmailService] Error initializing client for company ${companyId}:`, error);
      
      await query(
        `UPDATE channel_connections 
         SET status = 'error', error_message = $1, last_error_at = NOW()
         WHERE company_id = $2 AND channel_type = 'email'`,
        [error.message, companyId]
      );

      throw error;
    }
  }

  /**
   * Send email
   */
  async sendEmail(companyId, to, subject, content, options = {}) {
    try {
      const apiKey = this.clients.get(companyId);
      if (!apiKey) {
        throw new Error('Email client not initialized for this company');
      }

      sgMail.setApiKey(apiKey);

      const msg = {
        to: Array.isArray(to) ? to : [to],
        from: options.from || options.fromEmail || 'noreply@groupguru.com',
        subject: subject,
        text: options.text || content,
        html: options.html || content,
        ...options.sendGridOptions
      };

      // Add template if provided
      if (options.templateId) {
        msg.templateId = options.templateId;
        msg.dynamicTemplateData = options.templateData || {};
      }

      // Add attachments
      if (options.attachments && options.attachments.length > 0) {
        msg.attachments = options.attachments;
      }

      // Add tracking
      if (options.tracking !== false) {
        msg.trackingSettings = {
          clickTracking: { enable: true },
          openTracking: { enable: true },
          ...options.trackingSettings
        };
      }

      const [response] = await sgMail.send(msg);

      // Save outbound message
      await query(
        `INSERT INTO channel_messages (
          company_id, channel_connection_id, channel_type,
          channel_message_id, thread_id,
          from_identifier, to_identifier,
          message_type, content, direction, status,
          metadata, created_at
        ) VALUES (
          $1,
          (SELECT id FROM channel_connections WHERE company_id = $1 AND channel_type = 'email' LIMIT 1),
          'email',
          $2, $3,
          $4, $5,
          'email', $6, 'outbound', 'sent',
          $7, NOW()
        )`,
        [
          companyId,
          response.headers['x-message-id'] || `email_${Date.now()}`,
          Array.isArray(to) ? to.join(',') : to,
          msg.from,
          Array.isArray(to) ? to.join(',') : to,
          content,
          JSON.stringify({
            subject,
            messageId: response.headers['x-message-id'],
            status: response.statusCode
          })
        ]
      );

      // Update stats
      await query(
        `UPDATE channel_connections 
         SET last_activity_at = NOW(), message_count = message_count + 1
         WHERE company_id = $1 AND channel_type = 'email'`,
        [companyId]
      );

      return { 
        success: true, 
        messageId: response.headers['x-message-id'],
        statusCode: response.statusCode
      };
    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
      
      // Save failed message
      await query(
        `INSERT INTO channel_messages (
          company_id, channel_connection_id, channel_type,
          from_identifier, to_identifier,
          message_type, content, direction, status, error_message,
          created_at
        ) VALUES (
          $1,
          (SELECT id FROM channel_connections WHERE company_id = $1 AND channel_type = 'email' LIMIT 1),
          'email',
          $2, $3,
          'email', $4, 'outbound', 'failed', $5,
          NOW()
        )`,
        [companyId, options.from, Array.isArray(to) ? to.join(',') : to, content, error.message]
      );

      throw error;
    }
  }

  /**
   * Handle inbound email (webhook)
   */
  async handleInboundEmail(companyId, emailData) {
    try {
      // Save inbound message
      const result = await query(
        `INSERT INTO channel_messages (
          company_id, channel_connection_id, channel_type,
          channel_message_id, thread_id,
          from_identifier, to_identifier,
          message_type, content, direction, status,
          metadata, created_at
        ) VALUES (
          $1,
          (SELECT id FROM channel_connections WHERE company_id = $1 AND channel_type = 'email' LIMIT 1),
          'email',
          $2, $3,
          $4, $5,
          'email', $6, 'inbound', 'delivered',
          $7, NOW()
        )
        RETURNING id`,
        [
          companyId,
          emailData.messageId || `email_${Date.now()}`,
          emailData.threadId || emailData.to,
          emailData.from,
          emailData.to,
          emailData.text || emailData.html || '',
          JSON.stringify({
            subject: emailData.subject,
            headers: emailData.headers
          })
        ]
      );

      // Emit event
      const { EventBus } = require('../events/EventBus');
      const eventBus = new EventBus();
      await eventBus.emit('message.received', {
        entityId: result.rows[0].id,
        payload: {
          channel: 'email',
          messageId: result.rows[0].id,
          from: emailData.from,
          subject: emailData.subject,
          content: emailData.text || emailData.html
        }
      });

      // Update activity
      await query(
        `UPDATE channel_connections 
         SET last_activity_at = NOW(), message_count = message_count + 1
         WHERE company_id = $1 AND channel_type = 'email'`,
        [companyId]
      );

      return { success: true, messageId: result.rows[0].id };
    } catch (error) {
      console.error('[EmailService] Error handling inbound email:', error);
      throw error;
    }
  }

  /**
   * Handle email tracking events (opens, clicks)
   */
  async handleTrackingEvent(companyId, eventData) {
    try {
      // Find message by SendGrid message ID
      const result = await query(
        `UPDATE channel_messages
         SET 
           status = CASE 
             WHEN $1 = 'open' THEN 'read'
             WHEN $1 = 'bounce' THEN 'failed'
             WHEN $1 = 'dropped' THEN 'failed'
             ELSE status
           END,
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{tracking}',
             COALESCE(metadata->'tracking', '{}'::jsonb) || $2::jsonb
           ),
           status_updated_at = NOW()
         WHERE company_id = $3
           AND channel_type = 'email'
           AND (metadata->>'messageId') = $4
         RETURNING id`,
        [
          eventData.event,
          JSON.stringify({
            event: eventData.event,
            timestamp: eventData.timestamp,
            url: eventData.url,
            userAgent: eventData.userAgent
          }),
          companyId,
          eventData.sg_message_id
        ]
      );

      return { success: true, updated: result.rows.length > 0 };
    } catch (error) {
      console.error('[EmailService] Error handling tracking event:', error);
      throw error;
    }
  }
}

module.exports = EmailService;

