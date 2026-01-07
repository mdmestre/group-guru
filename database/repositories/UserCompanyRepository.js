/**
 * UserCompany Repository
 * 
 * Data access layer for user-company relationships (memberships).
 */

import { query, transaction } from '../connection.js';

export class UserCompanyRepository {
  /**
   * Add user to company
   * NOTE: When creating a new company, this doesn't require company context
   * because we're setting up the initial membership
   */
  static async create({ userId, companyId, role = 'member', invitedBy = null, allowNoContext = false }) {
    const result = await query(
      `INSERT INTO user_companies (user_id, company_id, role, invited_by, invited_at, joined_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [userId, companyId, role, invitedBy],
      allowNoContext ? { allowNoContext: true } : {}
    );

    return result.rows[0];
  }

  /**
   * Find membership
   */
  static async find(userId, companyId) {
    const result = await query(
      `SELECT uc.*, u.email, u.name as user_name, c.name as company_name
       FROM user_companies uc
       INNER JOIN users u ON u.id = uc.user_id
       INNER JOIN companies c ON c.id = uc.company_id
       WHERE uc.user_id = $1 AND uc.company_id = $2`,
      [userId, companyId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find active membership
   */
  static async findActive(userId, companyId) {
    const result = await query(
      `SELECT uc.*, u.email, u.name as user_name, c.name as company_name
       FROM user_companies uc
       INNER JOIN users u ON u.id = uc.user_id
       INNER JOIN companies c ON c.id = uc.company_id
       WHERE uc.user_id = $1 AND uc.company_id = $2 AND uc.is_active = true`,
      [userId, companyId]
    );
    return result.rows[0] || null;
  }

  /**
   * Update membership
   */
  static async update(userId, companyId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(updates[key]);
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(userId, companyId);

    const result = await query(
      `UPDATE user_companies 
       SET ${fields.join(', ')} 
       WHERE user_id = $${paramIndex} AND company_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Accept invitation (set joined_at)
   */
  static async acceptInvitation(userId, companyId) {
    const result = await query(
      `UPDATE user_companies 
       SET joined_at = NOW(), is_active = true, updated_at = NOW()
       WHERE user_id = $1 AND company_id = $2
       RETURNING *`,
      [userId, companyId]
    );
    return result.rows[0] || null;
  }

  /**
   * Remove user from company
   */
  static async remove(userId, companyId) {
    await query(
      'UPDATE user_companies SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND company_id = $2',
      [userId, companyId]
    );
  }

  /**
   * Get company members
   */
  static async findByCompanyId(companyId) {
    const result = await query(
      `SELECT uc.*, u.email, u.name as user_name, u.email_verified
       FROM user_companies uc
       INNER JOIN users u ON u.id = uc.user_id
       WHERE uc.company_id = $1 AND uc.is_active = true
       ORDER BY uc.role, u.name`,
      [companyId]
    );
    return result.rows;
  }

  /**
   * Get user's companies
   */
  static async findByUserId(userId) {
    const result = await query(
      `SELECT uc.*, c.name as company_name, c.slug, c.status
       FROM user_companies uc
       INNER JOIN companies c ON c.id = uc.company_id
       WHERE uc.user_id = $1 AND uc.is_active = true
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Check if user has role in company
   */
  static async hasRole(userId, companyId, role) {
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM user_companies 
       WHERE user_id = $1 AND company_id = $2 AND role = $3 AND is_active = true`,
      [userId, companyId, role]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Check if user has any of the roles
   */
  static async hasAnyRole(userId, companyId, roles) {
    if (!roles || roles.length === 0) return false;
    
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM user_companies 
       WHERE user_id = $1 AND company_id = $2 AND role = ANY($3) AND is_active = true`,
      [userId, companyId, roles]
    );
    return parseInt(result.rows[0].count) > 0;
  }
}

