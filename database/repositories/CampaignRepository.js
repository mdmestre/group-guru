/**
 * Campaign Repository
 * 
 * Data access layer for campaigns and campaign recipients
 */

import { query, transaction } from '../connection.js';
import { v4 as uuidv4 } from 'uuid';

export class CampaignRepository {
  /**
   * Create a new campaign
   */
  static async create({
    companyId,
    name,
    description,
    type,
    messageTemplate,
    mediaUrl,
    mediaType,
    targetFilters,
    scheduledAt,
    sendWindowStart,
    sendWindowEnd,
    timezone,
    messagesPerMinute,
    delayBetweenMessages,
    connectionId,
    createdBy
  }) {
    const id = uuidv4();
    const text = `
      INSERT INTO campaigns (
        id, company_id, name, description, type, status,
        message_template, media_url, media_type,
        target_filters, scheduled_at, send_window_start, send_window_end,
        timezone, messages_per_minute, delay_between_messages,
        connection_id, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'draft',
        $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, NOW(), NOW()
      ) RETURNING *
    `;

    const params = [
      id,
      companyId,
      name,
      description || null,
      type,
      messageTemplate,
      mediaUrl || null,
      mediaType || null,
      JSON.stringify(targetFilters || {}),
      scheduledAt || null,
      sendWindowStart || null,
      sendWindowEnd || null,
      timezone || 'UTC',
      messagesPerMinute || 10,
      delayBetweenMessages || 6000,
      connectionId || null,
      createdBy || null
    ];

    const result = await query(text, params);
    return this._formatCampaign(result.rows[0]);
  }

  /**
   * Get campaign by ID
   */
  static async findById(campaignId) {
    const text = `
      SELECT * FROM campaigns
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await query(text, [campaignId]);
    return result.rows[0] ? this._formatCampaign(result.rows[0]) : null;
  }

  /**
   * List campaigns for company
   */
  static async findByCompanyId(companyId, options = {}) {
    const {
      status,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDir = 'DESC'
    } = options;

    let text = `
      SELECT * FROM campaigns
      WHERE company_id = $1 AND deleted_at IS NULL
    `;
    const params = [companyId];

    if (status) {
      text += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    text += ` ORDER BY ${orderBy} ${orderDir}`;
    text += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(text, params);
    return result.rows.map(row => this._formatCampaign(row));
  }

  /**
   * Update campaign
   */
  static async update(campaignId, updates) {
    const allowedFields = [
      'name',
      'description',
      'message_template',
      'media_url',
      'media_type',
      'target_filters',
      'status',
      'scheduled_at',
      'send_window_start',
      'send_window_end',
      'timezone',
      'messages_per_minute',
      'delay_between_messages',
      'total_recipients',
      'sent_count',
      'delivered_count',
      'read_count',
      'failed_count',
      'started_at',
      'completed_at'
    ];

    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    let text = 'UPDATE campaigns SET ';
    const params = [];
    
    fields.forEach((field, index) => {
      if (index > 0) text += ', ';
      text += `${field} = $${params.length + 1}`;
      params.push(updates[field]);
    });

    text += `, updated_at = NOW()`;
    text += ` WHERE id = $${params.length + 1} AND deleted_at IS NULL`;
    text += ` RETURNING *`;
    
    params.push(campaignId);

    const result = await query(text, params);
    return result.rows[0] ? this._formatCampaign(result.rows[0]) : null;
  }

  /**
   * Add recipients to campaign
   */
  static async addRecipients(campaignId, contactIds) {
    if (!contactIds || contactIds.length === 0) {
      return [];
    }

    // Get campaign to retrieve company_id
    const campaign = await this.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Build INSERT values
    const values = contactIds.map((contactId, index) => {
      const id = uuidv4();
      return `('${id}', '${campaign.company_id}', '${campaignId}', '${contactId}', 'pending', NOW(), NOW())`;
    }).join(',');

    const text = `
      INSERT INTO campaign_recipients (
        id, company_id, campaign_id, contact_id, status, created_at, updated_at
      ) VALUES ${values}
      ON CONFLICT (campaign_id, contact_id) DO NOTHING
      RETURNING *
    `;

    const result = await query(text, []);
    return result.rows.map(row => this._formatRecipient(row));
  }

  /**
   * Get campaign recipients
   */
  static async getRecipients(campaignId, options = {}) {
    const {
      status,
      limit = 100,
      offset = 0
    } = options;

    let text = `
      SELECT cr.*, cc.name as contact_name, cc.whatsapp_id
      FROM campaign_recipients cr
      LEFT JOIN crm_contacts cc ON cr.contact_id = cc.id
      WHERE cr.campaign_id = $1
    `;
    const params = [campaignId];

    if (status) {
      text += ` AND cr.status = $${params.length + 1}`;
      params.push(status);
    }

    text += ` ORDER BY cr.created_at DESC`;
    text += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(text, params);
    return result.rows;
  }

  /**
   * Update recipient status
   */
  static async updateRecipientStatus(recipientId, status, errorMessage = null) {
    let text = `
      UPDATE campaign_recipients
      SET status = $1,
          ${status === 'sent' ? 'sent_at = NOW(),' : ''}
          ${status === 'delivered' ? 'delivered_at = NOW(),' : ''}
          ${status === 'read' ? 'read_at = NOW(),' : ''}
          ${status === 'failed' ? 'failed_at = NOW(),' : ''}
          last_event_at = NOW(),
          updated_at = NOW()
          ${errorMessage ? ',error_message = $3' : ''}
      WHERE id = $2
      RETURNING *
    `;

    const params = [status, recipientId];
    if (errorMessage) {
      params.push(errorMessage);
    }

    const result = await query(text, params);
    return result.rows[0] ? this._formatRecipient(result.rows[0]) : null;
  }

  /**
   * Get pending recipients for campaign
   */
  static async getPendingRecipients(campaignId, limit = 100) {
    const text = `
      SELECT cr.*, cc.whatsapp_id, cc.name
      FROM campaign_recipients cr
      LEFT JOIN crm_contacts cc ON cr.contact_id = cc.id
      WHERE cr.campaign_id = $1
      AND cr.status IN ('pending', 'queued')
      ORDER BY cr.created_at ASC
      LIMIT $2
    `;

    const result = await query(text, [campaignId, limit]);
    return result.rows;
  }

  /**
   * Get campaign stats
   */
  static async getStats(campaignId) {
    const text = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as read,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM campaign_recipients
      WHERE campaign_id = $1
    `;

    const result = await query(text, [campaignId]);
    return result.rows[0];
  }

  /**
   * Soft delete campaign
   */
  static async delete(campaignId) {
    const text = `
      UPDATE campaigns
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(text, [campaignId]);
    return result.rows[0] ? this._formatCampaign(result.rows[0]) : null;
  }

  /**
   * Format campaign object
   */
  static _formatCampaign(row) {
    if (!row) return null;
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      description: row.description,
      type: row.type,
      status: row.status,
      messageTemplate: row.message_template,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      targetFilters: typeof row.target_filters === 'string' ? JSON.parse(row.target_filters) : row.target_filters,
      targetContacts: row.target_contacts,
      scheduledAt: row.scheduled_at,
      sendWindowStart: row.send_window_start,
      sendWindowEnd: row.send_window_end,
      timezone: row.timezone,
      messagesPerMinute: row.messages_per_minute,
      delayBetweenMessages: row.delay_between_messages,
      totalRecipients: row.total_recipients,
      sentCount: row.sent_count,
      deliveredCount: row.delivered_count,
      readCount: row.read_count,
      failedCount: row.failed_count,
      clickedCount: row.clicked_count,
      connectionId: row.connection_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      createdBy: row.created_by,
      startedAt: row.started_at,
      completedAt: row.completed_at
    };
  }

  /**
   * Format recipient object
   */
  static _formatRecipient(row) {
    if (!row) return null;
    return {
      id: row.id,
      companyId: row.company_id,
      campaignId: row.campaign_id,
      contactId: row.contact_id,
      contactName: row.contact_name,
      whatsappId: row.whatsapp_id,
      status: row.status,
      queuedAt: row.queued_at,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      failedAt: row.failed_at,
      lastEventAt: row.last_event_at,
      errorMessage: row.error_message,
      messageId: row.message_id,
      jobId: row.job_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default CampaignRepository;
