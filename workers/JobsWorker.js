/**
 * Jobs Worker - Generic job processor
 * 
 * Features:
 * - Manages generic jobs
 * - Persists progress
 * - Integrates with UI monitoring
 */

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { query } from '../database/connection.js';
import contextManager from '../core/context/ContextManager.js';

class JobsWorker {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    this.worker = new Worker(
      'jobs',
      async (job) => {
        const { jobId, companyId, userId } = job.data;

        // Set context
        return await contextManager.run(
          {
            companyId,
            userId,
            source: 'job',
            requestId: job.id
          },
          async () => {
            return await this.processJob(jobId, job);
          }
        );
      },
      {
        connection: this.redis,
        concurrency: parseInt(process.env.JOBS_WORKER_CONCURRENCY || '5'),
        limiter: {
          max: 100,
          duration: 1000
        }
      }
    );

    this.setupEventHandlers();
  }

  async processJob(jobId, bullJob) {
    // Get job from database
    const jobResult = await query(
      'SELECT * FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }

    const job = jobResult.rows[0];

    // Update job status to active
    await query(
      `UPDATE jobs 
       SET status = $1, processed_at = NOW(), attempts_made = attempts_made + 1
       WHERE id = $2`,
      ['active', jobId]
    );

    try {
      // Process based on job type
      let result;

      switch (job.job_type) {
        case 'send_whatsapp':
          result = await this.processSendWhatsApp(job);
          break;
        
        case 'process_csv':
          result = await this.processCsv(job);
          break;
        
        case 'export_data':
          result = await this.processExportData(job);
          break;
        
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // Update job as completed
      await query(
        `UPDATE jobs 
         SET status = $1, finished_at = NOW(), returnvalue = $2, progress = 100
         WHERE id = $3`,
        ['completed', JSON.stringify(result), jobId]
      );

      // Log job completion
      await query(
        `INSERT INTO job_logs (company_id, job_id, level, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          job.company_id,
          jobId,
          'info',
          'Job completed successfully',
          JSON.stringify(result)
        ]
      );

      return result;
    } catch (error) {
      // Update job as failed
      await query(
        `UPDATE jobs 
         SET status = $1, finished_at = NOW(), failed_reason = $2
         WHERE id = $3`,
        ['failed', error.message, jobId]
      );

      // Log job failure
      await query(
        `INSERT INTO job_logs (company_id, job_id, level, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          job.company_id,
          jobId,
          'error',
          'Job failed',
          JSON.stringify({ error: error.message, stack: error.stack })
        ]
      );

      throw error;
    }
  }

  async processSendWhatsApp(job) {
    // TODO: Implement WhatsApp send
    return { success: true, messageId: `msg_${Date.now()}` };
  }

  async processCsv(job) {
    // TODO: Implement CSV processing
    return { success: true, processed: 0 };
  }

  async processExportData(job) {
    // TODO: Implement data export
    return { success: true, fileUrl: null };
  }

  setupEventHandlers() {
    this.worker.on('completed', (job) => {
      console.log(`[JobsWorker] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[JobsWorker] Job ${job.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('[JobsWorker] Error:', err);
    });

    // Progress tracking
    this.worker.on('progress', async (job, progress) => {
      const jobData = job.data;
      if (jobData.jobId) {
        await query(
          'UPDATE jobs SET progress = $1, progress_data = $2 WHERE id = $3',
          [progress, JSON.stringify({}), jobData.jobId]
        );
      }
    });
  }

  async close() {
    await this.worker.close();
    await this.redis.quit();
  }
}

export default JobsWorker;


