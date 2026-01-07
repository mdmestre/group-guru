/**
 * SMS Integration Service (Twilio)
 * Phase 4: Multi-channel support
 */

const twilio = require('twilio');
const { query } = require('../database');

class SMSService {
  constructor() {
    this.clients = new Map(); // companyId -> Twilio client
  }

  /**
   * Initialize Twilio client for a company
   */
  async initializeClient(companyId, accountSid, authToken, phoneNumber) {
    try {
      const client = twilio(accountSid, authToken);
      this.clients.set(companyId, { client, phoneNumber });

      // Update connection status
      await query(
        `UPDATE channel_connections 
         SET status = 'connected', error_message = NULL, last_activity_at = NOW()
         WHERE company_id = $1 AND channel_type = 'sms'`,
        [companyId]
      );

      return { success: true };
    } catch (error) {
      console.error(`[SMSService] Error initializing client for company ${companyId}:`, error);
      
      await query(
        `UPDATE channel_connections 
         SET status = 'error', error_message = $1, last_error_at = NOW()
         WHERE company_id = $2 AND channel_type = 'sms'`,
        [error.message, companyId]
      );

      throw error;
    }
  }

  /**
   * Send SMS
   */
  async sendSMS(companyId, to, content, options = {}) {
    try {
      const config = this.clients.get(companyId);
      if (!config) {
        throw new Error('SMS client not initialized for this company');
      }

      const params = {
        body: content,
        from: config.phoneNumber,
        to: to,
        ...options.twilioOptions
      };

      // Send MMS if media provided
      if (options.mediaUrl) {
        params.mediaUrl = Array.isArray(options.mediaUrl) ? options.mediaUrl : [options.mediaUrl];
      }

      const message = await config.client.messages.create(params);

      // Save outbound message
      await query(
        `INSERT INTO channel_messages (
          company_id, channel_connection_id, channel_type,
          channel_message_id, thread_id,
          from_identifier, to_identifier,
          message_type, content, media_url, direction, status,
          metadata, created_at
        ) VALUES (
          $1,
          (SELECT id FROM channel_connections WHERE company_id = $1 AND channel_type = 'sms' LIMIT 1),
          'sms',
          $2, $3,
          $4, $5,
          $6, $7, $8, 'outbound', 'sent',
          $9, NOW()
        )`,
        [
          companyId,
          message.sid,
          `${config.phoneNumber}_${to}`, // thread ID
          config.phoneNumber,
          to,
          options.mediaUrl ? 'mms' : 'text',
          content,
          options.mediaUrl || null,
          JSON.stringify({
            sid: message.sid,
            status: message.status,
            price: message.price,
            priceUnit: message.priceUnit
          })
        ]
      );

      // Update stats
      await query(
        `UPDATE channel_connections 
         SET last_activity_at = NOW(), message_count = message_count + 1
         WHERE company_id = $1 AND channel_type = 'sms'`,
        [companyId]
      );

      return { success: true, messageId: message.sid, price: message.price };
    } catch (error) {
      console.error('[SMSService] Error sending SMS:', error);
      
      // Save failed message
      await query(
        `INSERT INTO channel_messages (
          company_id, channel_connection_id, channel_type,
          from_identifier, to_identifier,
          message_type, content, direction, status, error_message,
          created_at
        ) VALUES (
          $1,
          (SELECT id FROM channel_connections WHERE company_id = $1 AND channel_type = 'sms' LIMIT 1),
          'sms',
          $2, $3,
          'text', $4, 'outbound', 'failed', $5,
          NOW()
        )`,
        [companyId, config?.phoneNumber, to, content, error.message]
      );

      throw error;
    }
  }

  /**
   * Handle inbound SMS (webhook)
   */
  async handleInboundSMS(companyId, twilioMessage) {
    try {
      // Save inbound message
      const result = await query(
        `INSERT INTO channel_messages (
          company_id, channel_connection_id, channel_type,
          channel_message_id, thread_id,
          from_identifier, to_identifier,
          message_type, content, media_url, direction, status,
          metadata, created_at
        ) VALUES (
          $1,
          (SELECT id FROM channel_connections WHERE company_id = $1 AND channel_type = 'sms' LIMIT 1),
          'sms',
          $2, $3,
          $4, $5,
          $6, $7, $8, 'inbound', 'delivered',
          $9, NOW()
        )
        RETURNING id`,
        [
          companyId,
          twilioMessage.MessageSid,
          `${twilioMessage.To}_${twilioMessage.From}`,
          twilioMessage.From,
          twilioMessage.To,
          twilioMessage.NumMedia > 0 ? 'mms' : 'text',
          twilioMessage.Body || '',
          twilioMessage.MediaUrl0 || null,
          JSON.stringify({
            accountSid: twilioMessage.AccountSid,
            numMedia: twilioMessage.NumMedia
          })
        ]
      );

      // Emit event
      const { EventBus } = require('../events/EventBus');
      const eventBus = new EventBus();
      await eventBus.emit('message.received', {
        entityId: result.rows[0].id,
        payload: {
          channel: 'sms',
          messageId: result.rows[0].id,
          from: twilioMessage.From,
          content: twilioMessage.Body
        }
      });

      // Update activity
      await query(
        `UPDATE channel_connections 
         SET last_activity_at = NOW(), message_count = message_count + 1
         WHERE company_id = $1 AND channel_type = 'sms'`,
        [companyId]
      );

      return { success: true, messageId: result.rows[0].id };
    } catch (error) {
      console.error('[SMSService] Error handling inbound SMS:', error);
      throw error;
    }
  }

  /**
   * Get SMS cost tracking
   */
  async getCosts(companyId, startDate, endDate) {
    try {
      const config = this.clients.get(companyId);
      if (!config) {
        throw new Error('SMS client not initialized');
      }

      const result = await query(
        `SELECT 
          COUNT(*) as total_messages,
          SUM((metadata->>'price')::numeric) as total_cost,
          SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound_count,
          SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound_count
         FROM channel_messages
         WHERE company_id = $1 
           AND channel_type = 'sms'
           AND created_at >= $2
           AND created_at <= $3`,
        [companyId, startDate, endDate]
      );

      return result.rows[0];
    } catch (error) {
      console.error('[SMSService] Error getting costs:', error);
      throw error;
    }
  }
}

module.exports = SMSService;

