/**
 * Dispatch Service
 * 
 * Orchestrates message dispatches and campaign execution
 * Coordinates between campaigns, contacts, and message queue
 */

import { CampaignRepository } from '../database/repositories/CampaignRepository.js';
import { MessageQueueService } from './MessageQueueService.js';
import auditService from '../core/audit/AuditService.js';
import contextManager from '../core/context/ContextManager.js';

export class DispatchService {
  /**
   * Launch campaign - adds all recipients to message queue
   */
  static async launchCampaign(campaignId) {
    console.log('[DispatchService] Launching campaign:', { campaignId });

    const ctx = contextManager.getContext();

    try {
      // Get campaign
      const campaign = await CampaignRepository.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        throw new Error(`Cannot launch campaign with status: ${campaign.status}`);
      }

      // Get pending recipients
      const recipients = await CampaignRepository.getPendingRecipients(campaignId, 1000);
      if (recipients.length === 0) {
        throw new Error('No recipients to dispatch');
      }

      // Queue messages with staggered delays
      const messages = recipients.map((recipient, index) => ({
        campaignId,
        recipientId: recipient.id,
        contactId: recipient.contact_id,
        whatsappId: recipient.whatsapp_id,
        messageTemplate: campaign.messageTemplate,
        mediaUrl: campaign.mediaUrl,
        mediaType: campaign.mediaType,
        companyId: campaign.companyId,
        delayBetween: campaign.delayBetweenMessages
      }));

      // Add to queue with exponential backoff
      const jobs = await MessageQueueService.addBatchToQueue(messages);

      // Update campaign status and metadata
      const updatedCampaign = await CampaignRepository.update(campaignId, {
        status: 'running',
        started_at: new Date(),
        total_recipients: recipients.length
      });

      // Audit log
      await auditService.log({
        action: 'campaign_launched',
        resourceType: 'campaign',
        resourceId: campaignId,
        newValues: {
          status: 'running',
          recipientCount: recipients.length,
          jobCount: jobs.length
        }
      });

      console.log('[DispatchService] Campaign launched:', {
        campaignId,
        recipientCount: recipients.length,
        jobsQueued: jobs.length
      });

      return {
        success: true,
        campaign: updatedCampaign,
        jobsQueued: jobs.length,
        recipientCount: recipients.length
      };
    } catch (error) {
      console.error('[DispatchService] Failed to launch campaign:', {
        campaignId,
        error: error.message
      });

      // Update campaign to failed status
      try {
        await CampaignRepository.update(campaignId, {
          status: 'failed'
        });
      } catch (updateError) {
        console.error('[DispatchService] Failed to update campaign status:', updateError);
      }

      throw error;
    }
  }

  /**
   * Create and launch campaign in one step
   */
  static async createAndLaunch({
    companyId,
    name,
    description,
    type,
    messageTemplate,
    mediaUrl,
    mediaType,
    targetFilters,
    contactIds,
    messagesPerMinute,
    delayBetweenMessages,
    connectionId,
    createdBy
  }) {
    console.log('[DispatchService] Creating and launching campaign:', { companyId, name });

    const ctx = contextManager.getContext();

    try {
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
        createdBy
      });

      // Add recipients
      if (contactIds && contactIds.length > 0) {
        const recipients = await CampaignRepository.addRecipients(campaign.id, contactIds);
        console.log('[DispatchService] Recipients added:', {
          campaignId: campaign.id,
          count: recipients.length
        });
      }

      // Launch campaign
      const launchResult = await this.launchCampaign(campaign.id);

      return {
        success: true,
        campaign: launchResult.campaign,
        recipientCount: launchResult.recipientCount,
        jobsQueued: launchResult.jobsQueued
      };
    } catch (error) {
      console.error('[DispatchService] Failed to create and launch campaign:', {
        companyId,
        name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Pause campaign (stops processing new messages)
   */
  static async pauseCampaign(campaignId) {
    console.log('[DispatchService] Pausing campaign:', { campaignId });

    try {
      const campaign = await CampaignRepository.update(campaignId, {
        status: 'paused'
      });

      await auditService.log({
        action: 'campaign_paused',
        resourceType: 'campaign',
        resourceId: campaignId
      });

      return campaign;
    } catch (error) {
      console.error('[DispatchService] Failed to pause campaign:', {
        campaignId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Resume campaign
   */
  static async resumeCampaign(campaignId) {
    console.log('[DispatchService] Resuming campaign:', { campaignId });

    try {
      const campaign = await CampaignRepository.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'paused') {
        throw new Error('Only paused campaigns can be resumed');
      }

      const updated = await CampaignRepository.update(campaignId, {
        status: 'running'
      });

      await auditService.log({
        action: 'campaign_resumed',
        resourceType: 'campaign',
        resourceId: campaignId
      });

      return updated;
    } catch (error) {
      console.error('[DispatchService] Failed to resume campaign:', {
        campaignId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cancel campaign
   */
  static async cancelCampaign(campaignId) {
    console.log('[DispatchService] Canceling campaign:', { campaignId });

    try {
      const campaign = await CampaignRepository.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (['completed', 'canceled', 'failed'].includes(campaign.status)) {
        throw new Error(`Cannot cancel campaign with status: ${campaign.status}`);
      }

      const updated = await CampaignRepository.update(campaignId, {
        status: 'canceled',
        completed_at: new Date()
      });

      await auditService.log({
        action: 'campaign_canceled',
        resourceType: 'campaign',
        resourceId: campaignId
      });

      return updated;
    } catch (error) {
      console.error('[DispatchService] Failed to cancel campaign:', {
        campaignId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get campaign detailed stats
   */
  static async getCampaignStats(campaignId) {
    try {
      const campaign = await CampaignRepository.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const stats = await CampaignRepository.getStats(campaignId);
      const queueStats = await MessageQueueService.getQueueStats();

      return {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          type: campaign.type
        },
        recipients: {
          total: parseInt(stats.total),
          pending: parseInt(stats.pending),
          queued: parseInt(stats.queued),
          sent: parseInt(stats.sent),
          delivered: parseInt(stats.delivered),
          read: parseInt(stats.read),
          failed: parseInt(stats.failed)
        },
        queue: queueStats,
        progress: {
          percentage: campaign.totalRecipients > 0 
            ? Math.round(((campaign.sentCount + campaign.deliveredCount + campaign.failedCount) / campaign.totalRecipients) * 100)
            : 0,
          sent: campaign.sentCount,
          delivered: campaign.deliveredCount,
          failed: campaign.failedCount
        },
        timing: {
          createdAt: campaign.createdAt,
          startedAt: campaign.startedAt,
          completedAt: campaign.completedAt
        }
      };
    } catch (error) {
      console.error('[DispatchService] Failed to get campaign stats:', {
        campaignId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get campaign recipients with detailed info
   */
  static async getCampaignRecipients(campaignId, options = {}) {
    try {
      return await CampaignRepository.getRecipients(campaignId, options);
    } catch (error) {
      console.error('[DispatchService] Failed to get recipients:', {
        campaignId,
        error: error.message
      });
      throw error;
    }
  }
}

export default DispatchService;
