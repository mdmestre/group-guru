/**
 * Webhooks Worker - Sends webhook payloads
 * 
 * Features:
 * - Sends payloads to external URLs
 * - Signs with secret
 * - Retry with backoff
 * - Persists in webhook_calls
 */

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { query } from '../database/connection.js';
import crypto from 'crypto';
import contextManager from '../core/context/ContextManager.js';

class WebhooksWorker {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    this.worker = new Worker(
      'webhooks',
      async (job) => {
        const { webhookId, eventType, payload, companyId } = job.data;

        // Set context
        return await contextManager.run(
          {
            companyId,
            source: 'job',
            requestId: job.id
          },
          async () => {
            return await this.sendWebhook(webhookId, eventType, payload);
          }
        );
      },
      {
        connection: this.redis,
        concurrency: parseInt(process.env.WEBHOOKS_WORKER_CONCURRENCY || '10'),
        limiter: {
          max: 100,
          duration: 1000
        }
      }
    );

    this.setupEventHandlers();
  }

  async sendWebhook(webhookId, eventType, payload) {
    // Get webhook
    const webhookResult = await query(
      'SELECT * FROM webhooks WHERE id = $1 AND is_active = true',
      [webhookId]
    );

    if (webhookResult.rows.length === 0) {
      throw new Error(`Webhook ${webhookId} not found or inactive`);
    }

    const webhook = webhookResult.rows[0];

    // Check if webhook listens to this event
    if (!webhook.events.includes(eventType)) {
      throw new Error(`Webhook ${webhookId} does not listen to event ${eventType}`);
    }

    const startTime = Date.now();
    let statusCode = null;
    let responseBody = null;
    let errorMessage = null;
    let status = 'failed';

    try {
      // Build request
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Stracta-Webhook/1.0',
        'X-Webhook-Event': eventType,
        'X-Webhook-Id': webhookId,
        ...JSON.parse(webhook.headers || '{}')
      };

      // Sign payload if secret exists
      if (webhook.secret) {
        const signature = this.signPayload(JSON.stringify(payload), webhook.secret);
        headers['X-Webhook-Signature'] = signature;
      }

      // Send request using Node.js http/https
      const http = webhook.url.startsWith('https:') 
        ? await import('https') 
        : await import('http');
      const url = new URL(webhook.url);
      
      const response = await new Promise((resolve, reject) => {
        const options = {
          hostname: url.hostname,
          port: url.port || (webhook.url.startsWith('https:') ? 443 : 80),
          path: url.pathname + url.search,
          method: webhook.method || 'POST',
          headers
        };
        
        const req = http.default.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              ok: res.statusCode >= 200 && res.statusCode < 300,
              text: () => Promise.resolve(data)
            });
          });
        });
        
        req.on('error', reject);
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
        
        req.write(JSON.stringify(payload));
        req.end();
      });

      statusCode = response.status;
      responseBody = await response.text();

      if (response.ok) {
        status = 'success';
      } else {
        errorMessage = `HTTP ${statusCode}: ${responseBody}`;
      }
    } catch (error) {
      errorMessage = error.message;
      if (error.name === 'AbortError') {
        status = 'timeout';
      }
    }

    const responseTime = Date.now() - startTime;

    // Persist webhook call
    const callResult = await query(
      `INSERT INTO webhook_calls (
        webhook_id, event_type, payload, status_code, response_body,
        response_time_ms, status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        webhookId,
        eventType,
        JSON.stringify(payload),
        statusCode,
        responseBody,
        responseTime,
        status,
        errorMessage
      ]
    );

    // Update webhook statistics
    if (status === 'success') {
      await query(
        `UPDATE webhooks 
         SET successful_calls = successful_calls + 1, 
             total_calls = total_calls + 1,
             last_called_at = NOW()
         WHERE id = $1`,
        [webhookId]
      );
    } else {
      await query(
        `UPDATE webhooks 
         SET failed_calls = failed_calls + 1,
             total_calls = total_calls + 1,
             last_called_at = NOW()
         WHERE id = $1`,
        [webhookId]
      );
    }

    if (status !== 'success') {
      throw new Error(errorMessage || `Webhook call failed with status ${status}`);
    }

    return {
      success: true,
      callId: callResult.rows[0].id,
      statusCode,
      responseTime
    };
  }

  signPayload(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  setupEventHandlers() {
    this.worker.on('completed', (job) => {
      console.log(`[WebhooksWorker] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[WebhooksWorker] Job ${job.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('[WebhooksWorker] Error:', err);
    });
  }

  async close() {
    await this.worker.close();
    await this.redis.quit();
  }
}

export default WebhooksWorker;

