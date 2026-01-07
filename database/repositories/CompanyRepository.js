/**
 * Company Repository
 * 
 * Data access layer for companies (workspaces).
 */

import { query, transaction } from '../connection.js';

export class CompanyRepository {
  /**
   * Create a new company
   * NOTE: This operation doesn't require company context because we're creating the company
   */
  static async create({ name, slug, status = 'trial', trialDays = 14 }) {
    const trialEndsAt = status === 'trial' 
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await query(
      `INSERT INTO companies (name, slug, status, trial_ends_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, slug, status, trialEndsAt],
      { allowNoContext: true } // Creating company - no companyId exists yet
    );

    return result.rows[0];
  }

  /**
   * Find company by ID
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM companies WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find company by slug
   */
  static async findBySlug(slug) {
    const result = await query(
      'SELECT * FROM companies WHERE slug = $1',
      [slug]
    );
    return result.rows[0] || null;
  }

  /**
   * Update company
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
      `UPDATE companies 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Check if slug is available
   */
  static async isSlugAvailable(slug, excludeId = null) {
    let sql = 'SELECT COUNT(*) as count FROM companies WHERE slug = $1';
    const params = [slug];

    if (excludeId) {
      sql += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count) === 0;
  }

  /**
   * Generate unique slug from name
   */
  static async generateUniqueSlug(name, excludeId = null) {
    let baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (!(await this.isSlugAvailable(slug, excludeId))) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Get companies for a user
   */
  static async findByUserId(userId) {
    const result = await query(
      `SELECT c.*, uc.role, uc.is_active as membership_active
       FROM companies c
       INNER JOIN user_companies uc ON uc.company_id = c.id
       WHERE uc.user_id = $1 AND uc.is_active = true
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Check if company trial has expired
   */
  static async checkTrialExpired(companyId) {
    const company = await this.findById(companyId);
    if (!company || company.status !== 'trial') return false;
    
    if (!company.trial_ends_at) return false;
    
    return new Date() > new Date(company.trial_ends_at);
  }

  /**
   * Get company with active subscription
   */
  static async findWithSubscription(companyId) {
    const result = await query(
      `SELECT c.*, s.id as subscription_id, s.status as subscription_status,
              s.current_period_start, s.current_period_end,
              p.id as plan_id, p.name as plan_name, p.display_name as plan_display_name,
              p.max_instances, p.max_users, p.max_dispatches_per_day,
              p.max_contacts, p.max_automations, p.features
       FROM companies c
       LEFT JOIN subscriptions s ON s.company_id = c.id AND s.status = 'active'
       LEFT JOIN plans p ON p.id = s.plan_id
       WHERE c.id = $1`,
      [companyId]
    );
    return result.rows[0] || null;
  }
}

