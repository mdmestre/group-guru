/**
 * Plan Repository
 * 
 * Data access layer for subscription plans.
 */

import { query } from '../connection.js';

export class PlanRepository {
  /**
   * Find plan by ID
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM plans WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find plan by name
   */
  static async findByName(name) {
    const result = await query(
      'SELECT * FROM plans WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  }

  /**
   * Find free plan
   */
  static async findFree() {
    return await this.findByName('free');
  }

  /**
   * Get all active plans
   */
  static async findAllActive() {
    const result = await query(
      'SELECT * FROM plans WHERE is_active = true ORDER BY price_monthly ASC'
    );
    return result.rows;
  }

  /**
   * Get all plans
   */
  static async findAll() {
    const result = await query(
      'SELECT * FROM plans ORDER BY price_monthly ASC'
    );
    return result.rows;
  }

  /**
   * Ensure default plans exist in database
   * This is a system operation that doesn't require company context
   * Can be called during server startup or when needed
   */
  static async ensureDefaultPlans() {
    const defaultPlans = [
      {
        name: 'free',
        display_name: 'Free',
        description: 'Plano gratuito com recursos básicos',
        max_instances: 1,
        max_users: 1,
        max_dispatches_per_day: 100,
        max_contacts: 500,
        max_automations: 3,
        price_monthly: 0,
        price_yearly: 0,
        currency: 'BRL',
        is_active: true
      },
      {
        name: 'pro',
        display_name: 'Pro',
        description: 'Plano profissional para pequenas empresas',
        max_instances: 3,
        max_users: 5,
        max_dispatches_per_day: 1000,
        max_contacts: 5000,
        max_automations: 20,
        price_monthly: 99.00,
        price_yearly: 990.00,
        currency: 'BRL',
        is_active: true
      },
      {
        name: 'enterprise',
        display_name: 'Enterprise',
        description: 'Solução completa para grandes empresas',
        max_instances: 10,
        max_users: 999,
        max_dispatches_per_day: 10000,
        max_contacts: null, // unlimited
        max_automations: null, // unlimited
        price_monthly: 499.00,
        price_yearly: 4990.00,
        currency: 'BRL',
        is_active: true
      }
    ];

    // Insert or update each plan using ON CONFLICT
    for (const plan of defaultPlans) {
      await query(
        `INSERT INTO plans (
          name, display_name, description, max_instances, max_users,
          max_dispatches_per_day, max_contacts, max_automations,
          price_monthly, price_yearly, currency, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          max_instances = EXCLUDED.max_instances,
          max_users = EXCLUDED.max_users,
          max_dispatches_per_day = EXCLUDED.max_dispatches_per_day,
          max_contacts = EXCLUDED.max_contacts,
          max_automations = EXCLUDED.max_automations,
          price_monthly = EXCLUDED.price_monthly,
          price_yearly = EXCLUDED.price_yearly,
          currency = EXCLUDED.currency,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()`,
        [
          plan.name,
          plan.display_name,
          plan.description,
          plan.max_instances,
          plan.max_users,
          plan.max_dispatches_per_day,
          plan.max_contacts,
          plan.max_automations,
          plan.price_monthly,
          plan.price_yearly,
          plan.currency,
          plan.is_active
        ],
        { allowNoContext: true } // System operation - no company context needed
      );
    }

    return defaultPlans.length;
  }
}

