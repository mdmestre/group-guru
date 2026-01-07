/**
 * Webhook Service
 * Phase 4: Custom webhooks with retry logic
 */

const axios = require('axios');
const crypto = require('crypto');
const { query } = require('../database');

class WebhookService {
  /**
   * Execute webhook with retry logic
   */
  async executeWebhook(webhookId, eventType, payload) {
    const webhook = await this.getWebhook(webhookId);
    
    if (!webhook || !webhook.is_active) {
      return { success: false, error: 'Webhook not found or inactive' };
    }

    if (!webhook.event_types.includes(eventType)) {
      return { success: false, error: 'Event type not subscribed' };
    }

    // Prepare request
    const url = webhook.url;
    const headers = this.buildHeaders(webhook);
    const body = this.buildPayload(payload, eventType);

    // Execute with retry
    return this.executeWithRetry(webhookId, url, headers, body, eventType, payload, 0);
  }

  /**
   * Execute webhook with exponential backoff retry
   */
  async executeWithRetry(webhookId, url, headers, body, eventType, payload, attemptNumber) {
    const webhook = await this.getWebhook(webhookId);
    const maxRetries = webhook.retry_count || 3;
    const timeout = webhook.timeout_ms || 5000;

    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Log execution start
      await this.logExecution(webhookId, executionId, eventType, payload, url, headers, 'pending', attemptNumber);

      // Make HTTP request
      const response = await axios({
        method: webhook.method || 'POST',
        url: url,
        headers: headers,
        data: body,
        timeout: timeout,
        validateStatus: () => true // Don't throw on any status
      });

      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      // Log execution result
      await this.logExecution(
        webhookId,
        executionId,
        eventType,
        payload,
        url,
        headers,
        success ? 'success' : 'failed',
        attemptNumber,
        {
          responseStatus: response.status,
          responseBody: response.data,
          responseHeaders: response.headers,
          duration
        },
        success ? null : `HTTP ${response.status}`
      );

      // Update webhook stats
      await this.updateWebhookStats(webhookId, success);

      if (success) {
        return { success: true, executionId, status: response.status };
      } else {
        // Retry if not at max attempts
        if (attemptNumber < maxRetries) {
          const delay = this.calculateRetryDelay(attemptNumber);
          await this.scheduleRetry(webhookId, executionId, eventType, payload, delay);
          return { success: false, retrying: true, attemptNumber, nextRetry: delay };
        } else {
          // Move to dead letter queue
          await this.markAsDeadLetter(executionId);
          return { success: false, error: `Failed after ${maxRetries} attempts`, executionId };
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      await this.logExecution(
        webhookId,
        executionId,
        eventType,
        payload,
        url,
        headers,
        'failed',
        attemptNumber,
        { duration },
        error.message
      );

      // Update webhook stats
      await this.updateWebhookStats(webhookId, false);

      // Retry if not at max attempts
      if (attemptNumber < maxRetries) {
        const delay = this.calculateRetryDelay(attemptNumber);
        await this.scheduleRetry(webhookId, executionId, eventType, payload, delay);
        return { success: false, retrying: true, attemptNumber, nextRetry: delay };
      } else {
        // Move to dead letter queue
        await this.markAsDeadLetter(executionId);
        return { success: false, error: error.message, executionId };
      }
    }
  }

  /**
   * Process scheduled retries
   */
  async processRetries() {
    const retries = await query(
      `SELECT we.*, w.url, w.custom_headers, w.auth_type, w.auth_credentials, w.retry_count, w.timeout_ms, w.method
       FROM webhook_executions we
       JOIN webhooks w ON we.webhook_id = w.id
       WHERE we.status = 'retrying'
         AND we.next_retry_at <= NOW()
       LIMIT 100`
    );

    for (const retry of retries.rows) {
      const webhook = {
        id: retry.webhook_id,
        url: retry.url,
        custom_headers: retry.custom_headers,
        auth_type: retry.auth_type,
        auth_credentials: retry.auth_credentials,
        retry_count: retry.retry_count,
        timeout_ms: retry.timeout_ms,
        method: retry.method
      };

      const headers = this.buildHeaders(webhook);
      const attemptNumber = retry.attempt_number + 1;

      await this.executeWithRetry(
        webhook.id,
        retry.url,
        headers,
        retry.payload,
        retry.event_type,
        retry.payload,
        attemptNumber
      );
    }
  }

  /**
   * Build request headers
   */
  buildHeaders(webhook) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'GroupGuru-Webhooks/1.0',
      ...webhook.custom_headers
    };

    // Add authentication
    if (webhook.auth_type === 'bearer' && webhook.auth_credentials?.token) {
      headers['Authorization'] = `Bearer ${webhook.auth_credentials.token}`;
    } else if (webhook.auth_type === 'basic' && webhook.auth_credentials?.username) {
      const auth = Buffer.from(`${webhook.auth_credentials.username}:${webhook.auth_credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else if (webhook.auth_type === 'header' && webhook.auth_credentials?.headerName) {
      headers[webhook.auth_credentials.headerName] = webhook.auth_credentials.headerValue;
    }

    // Add signature if secret provided
    if (webhook.secret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = JSON.stringify(webhook.payload || {});
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');
      
      headers['X-GroupGuru-Signature'] = `t=${timestamp},s=${signature}`;
      headers['X-GroupGuru-Timestamp'] = timestamp.toString();
    }

    return headers;
  }

  /**
   * Build webhook payload
   */
  buildPayload(payload, eventType) {
    return {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload
    };
  }

  /**
   * Calculate retry delay (exponential backoff)
   */
  calculateRetryDelay(attemptNumber) {
    return Math.min(1000 * Math.pow(2, attemptNumber), 30000); // Max 30s
  }

  /**
   * Schedule retry
   */
  async scheduleRetry(webhookId, executionId, eventType, payload, delayMs) {
    const nextRetryAt = new Date(Date.now() + delayMs);

    await query(
      `UPDATE webhook_executions
       SET status = 'retrying',
           attempt_number = attempt_number + 1,
           next_retry_at = $1
       WHERE id = $2`,
      [nextRetryAt, executionId]
    );
  }

  /**
   * Mark execution as dead letter
   */
  async markAsDeadLetter(executionId) {
    await query(
      `UPDATE webhook_executions
       SET status = 'dead_letter'
       WHERE id = $1`,
      [executionId]
    );
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(webhookId) {
    const result = await query(
      `SELECT * FROM webhooks WHERE id = $1`,
      [webhookId]
    );
    return result.rows[0];
  }

  /**
   * Log webhook execution
   */
  async logExecution(webhookId, executionId, eventType, payload, url, headers, status, attemptNumber, response = null, errorMessage = null) {
    const companyId = await this.getCompanyIdFromWebhook(webhookId);

    if (executionId) {
      // Update existing execution
      await query(
        `UPDATE webhook_executions
         SET status = $1,
             response_status = $2,
             response_body = $3,
             response_headers = $4,
             error_message = $5,
             attempt_number = $6,
             completed_at = NOW(),
             duration_ms = $7
         WHERE id = $8`,
        [
          status,
          response?.responseStatus || null,
          response?.responseBody ? JSON.stringify(response.responseBody) : null,
          response?.responseHeaders ? JSON.stringify(response.responseHeaders) : null,
          errorMessage,
          attemptNumber,
          response?.duration || null,
          executionId
        ]
      );
    } else {
      // Create new execution
      await query(
        `INSERT INTO webhook_executions (
          company_id, webhook_id, event_type, payload, url,
          request_headers, request_method, status, attempt_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          companyId,
          webhookId,
          eventType,
          JSON.stringify(payload),
          url,
          JSON.stringify(headers),
          'POST',
          status,
          attemptNumber
        ]
      );
    }
  }

  /**
   * Update webhook statistics
   */
  async updateWebhookStats(webhookId, success) {
    await query(
      `UPDATE webhooks
       SET total_calls = total_calls + 1,
           ${success ? 'success_count = success_count + 1' : 'error_count = error_count + 1'},
           last_called_at = NOW()
       WHERE id = $1`,
      [webhookId]
    );
  }

  /**
   * Get company ID from webhook
   */
  async getCompanyIdFromWebhook(webhookId) {
    const result = await query(
      `SELECT company_id FROM webhooks WHERE id = $1`,
      [webhookId]
    );
    return result.rows[0]?.company_id;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(signature, timestamp, payload, secret) {
    if (!signature || !timestamp || !secret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    const providedSignature = signature.split('s=')[1];
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature)
    );
  }
}

module.exports = WebhookService;

