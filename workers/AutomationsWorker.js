/**
 * Automations Worker - Processes automation runs
 * 
 * Features:
 * - Polls for pending runs
 * - Controls concurrency
 * - Updates status
 * - Generates granular logs
 */

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import contextManager from '../core/context/ContextManager.js';
import automationEngine from '../core/automation/AutomationEngine.js';

class AutomationsWorker {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 3) {
          throw new Error('Redis connection failed after 3 retries');
        }
        return Math.min(times * 50, 2000);
      }
    });

    this.worker = new Worker(
      'automations',
      async (job) => {
        const { runId, companyId, userId } = job.data;

        // Set context
        return await contextManager.run(
          {
            companyId,
            userId,
            source: 'job',
            requestId: job.id
          },
          async () => {
            return await automationEngine.executeRun(runId);
          }
        );
      },
      {
        connection: this.redis,
        concurrency: parseInt(process.env.AUTOMATIONS_WORKER_CONCURRENCY || '5'),
        limiter: {
          max: 100,
          duration: 1000
        }
      }
    );

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.worker.on('completed', (job) => {
      console.log(`[AutomationsWorker] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[AutomationsWorker] Job ${job.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('[AutomationsWorker] Error:', err);
    });
  }

  async close() {
    await this.worker.close();
    await this.redis.quit();
  }
}

export default AutomationsWorker;


