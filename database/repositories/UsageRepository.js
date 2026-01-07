/**
 * Usage Repository
 * 
 * Data access layer for usage tracking (plan limits).
 */

import { query } from '../connection.js';

export class UsageRepository {
  /**
   * Get or create daily usage record
   */
  static async getOrCreateDailyUsage(companyId, date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];

    // Try to get existing
    let result = await query(
      'SELECT * FROM daily_usage WHERE company_id = $1 AND usage_date = $2',
      [companyId, dateStr]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create new
    result = await query(
      `INSERT INTO daily_usage (company_id, usage_date)
       VALUES ($1, $2)
       RETURNING *`,
      [companyId, dateStr]
    );

    return result.rows[0];
  }

  /**
   * Increment dispatches count
   */
  static async incrementDispatches(companyId, count = 1, date = new Date()) {
    await this.getOrCreateDailyUsage(companyId, date);

    const dateStr = date.toISOString().split('T')[0];
    await query(
      `UPDATE daily_usage 
       SET dispatches_count = dispatches_count + $1, updated_at = NOW()
       WHERE company_id = $2 AND usage_date = $3`,
      [count, companyId, dateStr]
    );
  }

  /**
   * Get today's usage
   */
  static async getTodayUsage(companyId) {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      'SELECT * FROM daily_usage WHERE company_id = $1 AND usage_date = $2',
      [companyId, today]
    );
    return result.rows[0] || { dispatches_count: 0, instances_active: 0 };
  }

  /**
   * Get usage for date range
   */
  static async getUsageRange(companyId, startDate, endDate) {
    const result = await query(
      `SELECT * FROM daily_usage 
       WHERE company_id = $1 AND usage_date >= $2 AND usage_date <= $3
       ORDER BY usage_date DESC`,
      [companyId, startDate, endDate]
    );
    return result.rows;
  }

  /**
   * Update active instances count
   */
  static async updateActiveInstances(companyId, count, date = new Date()) {
    await this.getOrCreateDailyUsage(companyId, date);

    const dateStr = date.toISOString().split('T')[0];
    await query(
      `UPDATE daily_usage 
       SET instances_active = $1, updated_at = NOW()
       WHERE company_id = $2 AND usage_date = $3`,
      [count, companyId, dateStr]
    );
  }
}

