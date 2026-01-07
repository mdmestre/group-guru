/**
 * Event Bus - Central Event System
 * 
 * Event-driven architecture using BullMQ/Redis.
 * All events follow standard format:
 * {
 *   event: "contact.stage_changed",
 *   companyId,
 *   entityId,
 *   payload,
 *   occurredAt,
 *   requestId
 * }
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import contextManager from '../context/ContextManager.js';

class EventBus {
  constructor() {
    // Redis connection (lazy - will connect on first use)
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('[EventBus] Redis connection failed after 3 retries');
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      lazyConnect: true
    };
    this.redis = new Redis(this.redisConfig);

    // Event queue (created lazily, will fail gracefully if Redis unavailable)
    try {
      this.queue = new Queue('events', {
        connection: this.redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: {
            age: 86400, // Keep for 24 hours
            count: 10000
          },
          removeOnFail: {
            age: 604800 // Keep failures for 7 days
          }
        }
      });
    } catch (error) {
      console.warn('[EventBus] Queue creation failed (Redis may be unavailable):', error.message);
      this.queue = null;
    }
  }

  /**
   * Emit an event
   * @param {string} eventName - Event name (e.g., "contact.stage_changed")
   * @param {Object} params - Event parameters
   * @param {string} params.entityId - Entity ID
   * @param {Object} params.payload - Event payload
   * @param {string} params.companyId - Company ID (optional, uses context if not provided)
   * @returns {Promise<Object>} Job result
   */
  async emit(eventName, { entityId, payload = {}, companyId = null }) {
    if (!this.queue) {
      console.warn(`[EventBus] Queue not available, event ${eventName} will be dropped`);
      return null;
    }

    try {
      // Ensure Redis is connected
      if (this.redis.status !== 'ready' && this.redis.status !== 'connecting') {
        await this.redis.connect();
      }
    } catch (error) {
      console.warn(`[EventBus] Redis not available, event ${eventName} will be dropped:`, error.message);
      return null; // Return null instead of throwing
    }

    const ctx = contextManager.getContext();
    
    const event = {
      event: eventName,
      companyId: companyId || ctx?.companyId || null,
      entityId,
      payload,
      occurredAt: new Date().toISOString(),
      requestId: ctx?.requestId || null,
      source: ctx?.source || 'system'
    };

    // Validate required fields
    if (!event.companyId) {
      throw new Error(`Event ${eventName} requires companyId but none was provided`);
    }

    try {
      // Add to queue
      const job = await this.queue.add(eventName, event, {
        jobId: `${eventName}:${entityId}:${Date.now()}`,
        priority: this.getEventPriority(eventName)
      });

      return job;
    } catch (error) {
      console.warn(`[EventBus] Failed to emit event ${eventName}:`, error.message);
      return null;
    }
  }

  /**
   * Get priority for event type
   * @param {string} eventName - Event name
   * @returns {number} Priority (higher = more important)
   */
  getEventPriority(eventName) {
    const priorities = {
      'payment.failed': 10,
      'payment.success': 9,
      'automation.failed': 8,
      'contact.stage_changed': 7,
      'message.received': 6,
      'automation.started': 5,
      'automation.completed': 4,
      'campaign.started': 3,
      'campaign.completed': 2,
      'contact.created': 1,
      'contact.updated': 1
    };

    return priorities[eventName] || 0;
  }

  /**
   * Emit contact.created event
   */
  async emitContactCreated(contactId, contactData) {
    return this.emit('contact.created', {
      entityId: contactId,
      payload: contactData
    });
  }

  /**
   * Emit contact.updated event
   */
  async emitContactUpdated(contactId, changes) {
    return this.emit('contact.updated', {
      entityId: contactId,
      payload: changes
    });
  }

  /**
   * Emit contact.stage_changed event
   */
  async emitContactStageChanged(contactId, oldStage, newStage) {
    return this.emit('contact.stage_changed', {
      entityId: contactId,
      payload: {
        oldStage,
        newStage,
        changedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Emit message.received event
   */
  async emitMessageReceived(messageId, messageData) {
    return this.emit('message.received', {
      entityId: messageId,
      payload: messageData
    });
  }

  /**
   * Emit automation.started event
   */
  async emitAutomationStarted(automationId, runId, triggerData) {
    return this.emit('automation.started', {
      entityId: runId,
      payload: {
        automationId,
        triggerData
      }
    });
  }

  /**
   * Emit automation.completed event
   */
  async emitAutomationCompleted(runId, result) {
    return this.emit('automation.completed', {
      entityId: runId,
      payload: {
        result,
        completedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Emit automation.failed event
   */
  async emitAutomationFailed(runId, error) {
    return this.emit('automation.failed', {
      entityId: runId,
      payload: {
        error: error.message,
        stack: error.stack,
        failedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Emit campaign.started event
   */
  async emitCampaignStarted(campaignId, campaignData) {
    return this.emit('campaign.started', {
      entityId: campaignId,
      payload: campaignData
    });
  }

  /**
   * Emit campaign.completed event
   */
  async emitCampaignCompleted(campaignId, stats) {
    return this.emit('campaign.completed', {
      entityId: campaignId,
      payload: {
        stats,
        completedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Emit invoice.paid event
   */
  async emitInvoicePaid(invoiceId, paymentData) {
    return this.emit('invoice.paid', {
      entityId: invoiceId,
      payload: paymentData
    });
  }

  /**
   * Emit payment.failed event
   */
  async emitPaymentFailed(paymentId, error) {
    return this.emit('payment.failed', {
      entityId: paymentId,
      payload: {
        error: error.message,
        failedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Emit tag.added event
   */
  async emitTagAdded(contactId, tagId, tagData) {
    return this.emit('tag.added', {
      entityId: contactId,
      payload: {
        tagId,
        tagData,
        addedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Emit field.changed event
   */
  async emitFieldChanged(contactId, fieldId, oldValue, newValue) {
    return this.emit('field.changed', {
      entityId: contactId,
      payload: {
        fieldId,
        oldValue,
        newValue,
        changedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Close connections
   */
  async close() {
    await this.queue.close();
    await this.redis.quit();
  }
}

// Singleton instance
const eventBus = new EventBus();

export default eventBus;


