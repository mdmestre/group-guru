/**
 * WhatsApp Connection Repository
 * 
 * Data access layer for WhatsApp connections.
 */

import { query } from '../connection.js';
import { randomUUID } from 'crypto';

export class WhatsAppConnectionRepository {
  /**
   * Create a new connection
   */
  static async create({ companyId, name }) {
    // Generate connection_id: companyId_uuid
    const connectionId = `${companyId}_${randomUUID()}`;

    const result = await query(
      `INSERT INTO whatsapp_connections (company_id, name, connection_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [companyId, name, connectionId, 'disconnected']
    );

    return result.rows[0];
  }

  /**
   * Find connection by ID
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM whatsapp_connections WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find connection by connection_id (Baileys identifier)
   */
  static async findByConnectionId(connectionId) {
    const result = await query(
      'SELECT * FROM whatsapp_connections WHERE connection_id = $1',
      [connectionId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all connections for a company
   */
  static async findByCompanyId(companyId) {
    const result = await query(
      `SELECT * FROM whatsapp_connections 
       WHERE company_id = $1 
       ORDER BY created_at DESC`,
      [companyId]
    );
    return result.rows;
  }

  /**
   * Count active connections for a company
   */
  static async countActiveByCompanyId(companyId) {
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM whatsapp_connections 
       WHERE company_id = $1 AND status = 'connected'`,
      [companyId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Count total connections for a company
   */
  static async countByCompanyId(companyId) {
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM whatsapp_connections 
       WHERE company_id = $1`,
      [companyId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Update connection
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
      `UPDATE whatsapp_connections 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Update connection by connection_id
   */
  static async updateByConnectionId(connectionId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(updates[key]);
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(connectionId);

    const result = await query(
      `UPDATE whatsapp_connections 
       SET ${fields.join(', ')} 
       WHERE connection_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Update connection status
   */
  static async updateStatus(id, status, metadata = {}) {
    const updates = { status, ...metadata };
    if (status === 'connected') {
      updates.connected_at = new Date();
    }
    return await this.update(id, updates);
  }

  /**
   * Delete connection
   */
  static async delete(id) {
    await query(
      'DELETE FROM whatsapp_connections WHERE id = $1',
      [id]
    );
  }

  /**
   * Check if company can create more connections (based on limit)
   */
  static async canCreateConnection(companyId, maxInstances) {
    const count = await this.countByCompanyId(companyId);
    return count < maxInstances;
  }
}

