/**
 * User Repository
 * 
 * Data access layer for users.
 */

import { query } from '../connection.js';
import bcrypt from 'bcryptjs';

export class UserRepository {
  /**
   * Create a new user
   * NOTE: This operation doesn't require company context because users are created
   * before companies (during registration). The company is created after the user.
   */
  static async create({ email, password, name = null }) {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, email_verified, is_active, created_at`,
      [email, passwordHash, name],
      { allowNoContext: true } // Creating user - no companyId exists yet (company is created after user)
    );

    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await query(
      'SELECT id, email, name, email_verified, is_active, last_login_at, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Verify password
   */
  static async verifyPassword(user, password) {
    if (!user || !user.password_hash) return false;
    return await bcrypt.compare(password, user.password_hash);
  }

  /**
   * Update user
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (key === 'password') {
        // Hash password before updating
        return; // We'll handle this separately
      }
      fields.push(`${key} = $${paramIndex++}`);
      values.push(updates[key]);
    });

    if (updates.password) {
      const passwordHash = await bcrypt.hash(updates.password, 10);
      fields.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE users 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING id, email, name, email_verified, is_active, created_at`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Update last login timestamp
   * NOTE: This operation doesn't require company context because it's a system operation
   * that updates user metadata (not tenant-specific data)
   */
  static async updateLastLogin(id) {
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [id],
      { allowNoContext: true } // System operation - updating user metadata doesn't require company context
    );
  }

  /**
   * Get user with company memberships
   */
  static async findWithCompanies(userId) {
    const result = await query(
      `SELECT u.*, 
              json_agg(
                json_build_object(
                  'id', c.id,
                  'name', c.name,
                  'slug', c.slug,
                  'role', uc.role,
                  'status', c.status
                ) ORDER BY c.created_at DESC
              ) FILTER (WHERE c.id IS NOT NULL) as companies
       FROM users u
       LEFT JOIN user_companies uc ON uc.user_id = u.id AND uc.is_active = true
       LEFT JOIN companies c ON c.id = uc.company_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    const user = result.rows[0];
    if (!user) return null;

    return {
      ...user,
      companies: user.companies || []
    };
  }
}

