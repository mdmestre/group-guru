/**
 * Message Queue Service
 * 
 * Manages message dispatch queue using BullMQ/Redis
 * Handles job creation, tracking, and retry logic
 */

import Queue from 'bull';
import Redis from 'redis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: true
};

export class MessageQueueService {
  static queueInstance = null;

  /**
   * Initialize queue
   */
  static async initializeQueue() {
    if (this.queueInstance) {
      return this.queueInstance;
    }

    try {
      this.queueInstance = new Queue('message-dispatch', {
        redis: redisConfig,
        defaultJobOptions: {
          attempts: 3, // Retry 3 times
          backoff: {
            type: 'exponential',
            delay: 2000 // Start with 2s, then 4s, 8s
          },
          removeOnComplete: true, // Keep queue clean
          removeOnFail: false // Keep failures for debugging
        }
      });

      // Event listeners
      this.queueInstance.on('error', (error) => {
        console.error('[MessageQueue] Queue error:', error);
      });

      this.queueInstance.on('failed', (job, error) => {
        console.error('[MessageQueue] Job failed:', {
          jobId: job.id,
          campaignId: job.data.campaignId,
          recipientId: job.data.recipientId,
          error: error.message,
          attempts: job.attemptsMade
        });
      });

      console.log('[MessageQueue] Queue initialized');
      return this.queueInstance;
    } catch (error) {
      console.error('[MessageQueue] Failed to initialize queue:', error);
      throw error;
    }
  }

  /**
   * Get queue instance
   */
  static getQueue() {
    if (!this.queueInstance) {
      throw new Error('Queue not initialized. Call initializeQueue() first.');
    }
    return this.queueInstance;
  }

  /**
   * Add message to queue
   */
  static async addMessageToQueue({
    campaignId,
    recipientId,
    contactId,
    whatsappId,
    messageTemplate,
    mediaUrl,
    mediaType,
    companyId,
    delayMs = 0
  }) {
    try {
      const queue = this.getQueue();

      const job = await queue.add(
        {
          campaignId,
          recipientId,
          contactId,
          whatsappId,
          messageTemplate,
          mediaUrl,
          mediaType,
          companyId,
          createdAt: new Date().toISOString()
        },
        {
          delay: delayMs, // Schedule for later if specified
          jobId: `${campaignId}:${recipientId}`, // Unique ID to prevent duplicates
          priority: 10 // High priority
        }
      );

      console.log('[MessageQueue] Message added to queue:', {
        jobId: job.id,
        campaignId,
        recipientId,
        delay: delayMs
      });

      return job;
    } catch (error) {
      console.error('[MessageQueue] Failed to add message:', {
        campaignId,
        recipientId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add multiple messages in batch
   */
  static async addBatchToQueue(messages) {
    try {
      const queue = this.getQueue();

      const jobs = await queue.addBulk(
        messages.map((msg, index) => ({
          name: 'dispatch-message',
          data: {
            campaignId: msg.campaignId,
            recipientId: msg.recipientId,
            contactId: msg.contactId,
            whatsappId: msg.whatsappId,
            messageTemplate: msg.messageTemplate,
            mediaUrl: msg.mediaUrl,
            mediaType: msg.mediaType,
            companyId: msg.companyId,
            createdAt: new Date().toISOString()
          },
          opts: {
            delay: msg.delayMs || (index * (msg.delayBetween || 6000)), // Stagger messages
            jobId: `${msg.campaignId}:${msg.recipientId}`,
            priority: 10
          }
        }))
      );

      console.log('[MessageQueue] Batch added to queue:', {
        count: jobs.length,
        campaignId: messages[0]?.campaignId
      });

      return jobs;
    } catch (error) {
      console.error('[MessageQueue] Failed to add batch:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId) {
    try {
      const queue = this.getQueue();
      const job = await queue.getJob(jobId);

      if (!job) {
        return null;
      }

      const progress = job.progress();
      const state = await job.getState();

      return {
        id: job.id,
        state,
        progress,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        data: job.data,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace
      };
    } catch (error) {
      console.error('[MessageQueue] Failed to get job status:', error);
      return null;
    }
  }

  /**
   * Get queue stats
   */
  static async getQueueStats() {
    try {
      const queue = this.getQueue();

      const [
        waitingCount,
        activeCount,
        completedCount,
        failedCount,
        delayedCount
      ] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);

      return {
        waiting: waitingCount,
        active: activeCount,
        completed: completedCount,
        failed: failedCount,
        delayed: delayedCount,
        total: waitingCount + activeCount + completedCount + failedCount + delayedCount
      };
    } catch (error) {
      console.error('[MessageQueue] Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * Clear queue (use with caution)
   */
  static async clearQueue() {
    try {
      const queue = this.getQueue();
      await queue.clean(0, 'active');
      await queue.clean(0, 'wait');
      console.log('[MessageQueue] Queue cleared');
    } catch (error) {
      console.error('[MessageQueue] Failed to clear queue:', error);
      throw error;
    }
  }

  /**
   * Pause queue
   */
  static async pauseQueue() {
    try {
      const queue = this.getQueue();
      await queue.pause();
      console.log('[MessageQueue] Queue paused');
    } catch (error) {
      console.error('[MessageQueue] Failed to pause queue:', error);
    }
  }

  /**
   * Resume queue
   */
  static async resumeQueue() {
    try {
      const queue = this.getQueue();
      await queue.resume();
      console.log('[MessageQueue] Queue resumed');
    } catch (error) {
      console.error('[MessageQueue] Failed to resume queue:', error);
    }
  }

  /**
   * Close queue connection
   */
  static async closeQueue() {
    try {
      if (this.queueInstance) {
        await this.queueInstance.close();
        this.queueInstance = null;
        console.log('[MessageQueue] Queue closed');
      }
    } catch (error) {
      console.error('[MessageQueue] Failed to close queue:', error);
    }
  }
}

export default MessageQueueService;
