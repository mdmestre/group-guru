/**
 * Subscription Repository
 * 
 * Data access layer for company subscriptions.
 */

import { query, transaction } from '../connection.js';

export class SubscriptionRepository {
  /**
   * Create subscription
   * Ensures only one active subscription per company
   * @param {Object} params - Subscription parameters
   * @param {string} params.companyId - Company ID
   * @param {string} params.planId - Plan ID
   * @param {string} params.status - Subscription status (default: 'active')
   * @param {number} params.trialDays - Trial days (optional)
   * @param {Object} options - Options
   * @param {boolean} options.allowNoContext - Allow creation without company context
   */
  static async create({ companyId, planId, status = 'active', trialDays = null }, options = {}) {
    return await transaction(async (client) => {
      // Cancel any existing active subscription
      await client.query(
        `UPDATE subscriptions 
         SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
         WHERE company_id = $1 AND status = 'active'`,
        [companyId]
      );

      // Calculate period dates
      const now = new Date();
      const currentPeriodStart = now;
      let currentPeriodEnd = null;
      let trialEndsAt = null;

      if (status === 'trial' && trialDays) {
        trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
      } else if (status === 'active') {
        // Default to monthly subscription
        currentPeriodEnd = new Date(now);
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      }

      // Create new subscription
      const result = await client.query(
        `INSERT INTO subscriptions 
         (company_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [companyId, planId, status, trialEndsAt, currentPeriodStart, currentPeriodEnd]
      );

      return result.rows[0];
    }, options);
  }

  /**
   * Create trial subscription (convenience method)
   * NOTE: Used when creating a new company - doesn't require company context
   */
  static async createTrial({ companyId, plan, trialDays = 14 }) {
    // Find plan by name
    const planResult = await query(
      'SELECT * FROM plans WHERE name = $1',
      [plan],
      { allowNoContext: true } // Creating subscription for new company
    );

    if (!planResult.rows[0]) {
      throw new Error(`Plan "${plan}" not found`);
    }

    const planId = planResult.rows[0].id;

    // Use transaction with allowNoContext since we're creating subscription for new company
    return await transaction(async (client) => {
      // Calculate trial end date
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

      // Create trial subscription
      const result = await client.query(
        `INSERT INTO subscriptions 
         (company_id, plan_id, status, trial_ends_at, current_period_start)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [companyId, planId, 'trial', trialEndsAt, now]
      );

      return result.rows[0];
    }, { allowNoContext: true });
  }

  /**
   * Find active subscription for company
   */
  static async findActive(companyId) {
    const result = await query(
      `SELECT s.*, p.name as plan_name, p.display_name, p.max_instances, 
              p.max_users, p.max_dispatches_per_day, p.max_contacts, 
              p.max_automations, p.features
       FROM subscriptions s
       INNER JOIN plans p ON p.id = s.plan_id
       WHERE s.company_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [companyId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find subscription by ID
   */
  static async findById(id) {
    const result = await query(
      `SELECT s.*, p.name as plan_name, p.display_name, p.max_instances, 
              p.max_users, p.max_dispatches_per_day, p.max_contacts, 
              p.max_automations, p.features
       FROM subscriptions s
       INNER JOIN plans p ON p.id = s.plan_id
       WHERE s.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Update subscription
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(updates[key]);
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE subscriptions 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Cancel subscription
   */
  static async cancel(id) {
    const result = await query(
      `UPDATE subscriptions 
       SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get subscription with plan details for company
   */
  static async findWithPlan(companyId) {
    return await this.findActive(companyId);
  }
}

