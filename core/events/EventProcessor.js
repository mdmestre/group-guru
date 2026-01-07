/**
 * Event Processor - Listens to events and triggers actions
 * 
 * Processes events from Event Bus and:
 * - Triggers automations
 * - Sends webhooks
 * - Updates related entities
 */

import { QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { query } from '../../database/connection.js';
import contextManager from '../context/ContextManager.js';
import automationEngine from '../automation/AutomationEngine.js';

class EventProcessor {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    this.eventsQueue = new Queue('events', { connection: this.redis });
    this.queueEvents = new QueueEvents('events', { connection: this.redis });
    this.automationsQueue = new Queue('automations', { connection: this.redis });
    this.webhooksQueue = new Queue('webhooks', { connection: this.redis });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen to completed events
    this.queueEvents.on('completed', async ({ jobId, returnvalue }) => {
      try {
        const job = await this.eventsQueue.getJob(jobId);
        if (job) {
          const event = job.data;
          await this.processEvent(event);
        }
      } catch (error) {
        console.error('[EventProcessor] Error processing event:', error);
      }
    });
  }

  async processEvent(event) {
    const { event: eventName, companyId, entityId, payload } = event;

    // Set context
    await contextManager.run(
      {
        companyId,
        source: 'system',
        requestId: event.requestId
      },
      async () => {
        // Process based on event type
        switch (eventName) {
          case 'contact.created':
            await this.handleContactCreated(entityId, payload);
            break;
          
          case 'contact.updated':
            await this.handleContactUpdated(entityId, payload);
            break;
          
          case 'contact.stage_changed':
            await this.handleContactStageChanged(entityId, payload);
            break;
          
          case 'message.received':
            await this.handleMessageReceived(entityId, payload);
            break;
          
          case 'automation.started':
            // Automation already started, no action needed
            break;
          
          case 'automation.completed':
            // Automation completed, no action needed
            break;
          
          case 'automation.failed':
            // Automation failed, no action needed
            break;
          
          case 'campaign.started':
            // Campaign started, no action needed
            break;
          
          case 'campaign.completed':
            // Campaign completed, no action needed
            break;
          
          case 'invoice.paid':
            await this.handleInvoicePaid(entityId, payload);
            break;
          
          case 'payment.failed':
            await this.handlePaymentFailed(entityId, payload);
            break;
          
          case 'tag.added':
            await this.handleTagAdded(entityId, payload);
            break;
          
          case 'field.changed':
            await this.handleFieldChanged(entityId, payload);
            break;
          
          default:
            console.warn(`[EventProcessor] Unknown event type: ${eventName}`);
        }

        // Send webhooks for this event
        await this.sendWebhooksForEvent(eventName, companyId, event);
      }
    );
  }

  async handleContactCreated(contactId, payload) {
    // Find automations triggered by contact.created
    const automations = await query(
      `SELECT * FROM automations 
       WHERE company_id = $1 
       AND is_active = true 
       AND is_paused = false
       AND trigger_type = $2`,
      [contextManager.getCompanyId(), 'contact_created']
    );

    for (const automation of automations.rows) {
      // Create automation run
      const run = await automationEngine.createRun(
        automation.id,
        contactId,
        { contact: payload }
      );

      // Queue automation execution
      await this.automationsQueue.add(
        'execute',
        {
          runId: run.id,
          companyId: automation.company_id,
          userId: null
        },
        {
          jobId: `automation:${run.id}`
        }
      );
    }
  }

  async handleContactUpdated(contactId, payload) {
    // Find automations triggered by contact.updated or field_changed
    const changedFields = payload.changedFields || [];
    
    // Check for field_changed trigger
    for (const fieldId of changedFields) {
      const automations = await query(
        `SELECT * FROM automations 
         WHERE company_id = $1 
         AND is_active = true 
         AND is_paused = false
         AND trigger_type = $2
         AND trigger_config->>'fieldId' = $3`,
        [
          contextManager.getCompanyId(),
          'field_changed',
          fieldId
        ]
      );

      for (const automation of automations.rows) {
        const run = await automationEngine.createRun(
          automation.id,
          contactId,
          {
            fieldId,
            oldValue: payload.oldValues?.[fieldId],
            newValue: payload.newValues?.[fieldId]
          }
        );

        await this.automationsQueue.add(
          'execute',
          {
            runId: run.id,
            companyId: automation.company_id,
            userId: null
          },
          {
            jobId: `automation:${run.id}`
          }
        );
      }
    }
  }

  async handleContactStageChanged(contactId, payload) {
    // Find automations triggered by stage_changed
    const automations = await query(
      `SELECT * FROM automations 
       WHERE company_id = $1 
       AND is_active = true 
       AND is_paused = false
       AND trigger_type = $2
       AND trigger_config->>'stageId' = $3`,
      [
        contextManager.getCompanyId(),
        'stage_changed',
        payload.newStage
      ]
    );

    for (const automation of automations.rows) {
      const run = await automationEngine.createRun(
        automation.id,
        contactId,
        {
          oldStage: payload.oldStage,
          newStage: payload.newStage
        }
      );

      await this.automationsQueue.add(
        'execute',
        {
          runId: run.id,
          companyId: automation.company_id,
          userId: null
        },
        {
          jobId: `automation:${run.id}`
        }
      );
    }
  }

  async handleMessageReceived(messageId, payload) {
    // Find automations triggered by message_received
    const automations = await query(
      `SELECT * FROM automations 
       WHERE company_id = $1 
       AND is_active = true 
       AND is_paused = false
       AND trigger_type = $2`,
      [contextManager.getCompanyId(), 'message_received']
    );

    for (const automation of automations.rows) {
      const contactId = payload.contactId;
      if (contactId) {
        const run = await automationEngine.createRun(
          automation.id,
          contactId,
          { message: payload }
        );

        await this.automationsQueue.add(
          'execute',
          {
            runId: run.id,
            companyId: automation.company_id,
            userId: null
          },
          {
            jobId: `automation:${run.id}`
          }
        );
      }
    }
  }

  async handleInvoicePaid(invoiceId, payload) {
    // Handle invoice paid event
    // Could trigger automations, update subscriptions, etc.
  }

  async handlePaymentFailed(paymentId, payload) {
    // Handle payment failed event
    // Could trigger notifications, update subscription status, etc.
  }

  async handleTagAdded(contactId, payload) {
    // Find automations triggered by tag_added
    const automations = await query(
      `SELECT * FROM automations 
       WHERE company_id = $1 
       AND is_active = true 
       AND is_paused = false
       AND trigger_type = $2
       AND (trigger_config->>'tagId' = $3 OR trigger_config->>'tagId' IS NULL)`,
      [
        contextManager.getCompanyId(),
        'tag_added',
        payload.tagId
      ]
    );

    for (const automation of automations.rows) {
      const run = await automationEngine.createRun(
        automation.id,
        contactId,
        {
          tagId: payload.tagId,
          tagData: payload.tagData
        }
      );

      await this.automationsQueue.add(
        'execute',
        {
          runId: run.id,
          companyId: automation.company_id,
          userId: null
        },
        {
          jobId: `automation:${run.id}`
        }
      );
    }
  }

  async handleFieldChanged(contactId, payload) {
    // Find automations triggered by field_changed
    const automations = await query(
      `SELECT * FROM automations 
       WHERE company_id = $1 
       AND is_active = true 
       AND is_paused = false
       AND trigger_type = $2
       AND (trigger_config->>'fieldId' = $3 OR trigger_config->>'fieldId' IS NULL)`,
      [
        contextManager.getCompanyId(),
        'field_changed',
        payload.fieldId
      ]
    );

    for (const automation of automations.rows) {
      const run = await automationEngine.createRun(
        automation.id,
        contactId,
        {
          fieldId: payload.fieldId,
          oldValue: payload.oldValue,
          newValue: payload.newValue
        }
      );

      await this.automationsQueue.add(
        'execute',
        {
          runId: run.id,
          companyId: automation.company_id,
          userId: null
        },
        {
          jobId: `automation:${run.id}`
        }
      );
    }
  }

  async sendWebhooksForEvent(eventName, companyId, event) {
    // Find webhooks that listen to this event
    const webhooks = await query(
      `SELECT * FROM webhooks 
       WHERE company_id = $1 
       AND is_active = true 
       AND $2 = ANY(events)`,
      [companyId, eventName]
    );

    for (const webhook of webhooks.rows) {
      // Queue webhook send
      await this.webhooksQueue.add(
        'send',
        {
          webhookId: webhook.id,
          eventType: eventName,
          payload: event,
          companyId
        },
        {
          jobId: `webhook:${webhook.id}:${eventName}:${Date.now()}`
        }
      );
    }
  }

  async close() {
    await this.queueEvents.close();
    await this.eventsQueue.close();
    await this.automationsQueue.close();
    await this.webhooksQueue.close();
    await this.redis.quit();
  }
}

export default EventProcessor;


