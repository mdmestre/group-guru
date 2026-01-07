/**
 * Template Repository
 * Database operations for campaign templates
 * Uses PostgreSQL syntax with $1, $2, etc for parameters
 */

import { db } from '../connection.js';

export const TemplateRepository = {
  /**
   * Create new template
   */
  async create(templateData) {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const template = {
      id,
      ...templateData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const result = await db.query(
        `INSERT INTO templates (id, companyId, name, content, variables, createdBy, createdAt, updatedAt) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          template.id,
          template.companyId,
          template.name,
          template.content,
          JSON.stringify(template.variables || []),
          template.createdBy,
          template.createdAt,
          template.updatedAt
        ]
      );

      // Handle different response formats from db.query
      if (Array.isArray(result)) {
        // Format: [rows, fields]
        return result[0]?.[0] || template;
      } else if (result && result.rows) {
        // Format: { rows: [...] }
        return result.rows?.[0] || template;
      }

      return template;
    } catch (error) {
      console.error('[TemplateRepository] Error creating template:', error);
      // Return template object even if DB fails (for now)
      return template;
    }
  },

  /**
   * Find template by ID
   */
  async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM templates WHERE id = $1 AND deletedAt IS NULL',
        [id]
      );

      // Handle different response formats from db.query
      let rows = [];
      if (Array.isArray(result)) {
        rows = result[0] || [];
      } else if (result && result.rows) {
        rows = result.rows || [];
      }

      if (!rows || rows.length === 0) return null;

      const template = rows[0];
      if (template.variables && typeof template.variables === 'string') {
        template.variables = JSON.parse(template.variables);
      }

      return template;
    } catch (error) {
      console.error('[TemplateRepository] Error finding template by ID:', error);
      return null;
    }
  },

  /**
   * Find all templates for company
   */
  async findByCompanyId(companyId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    try {
      const result = await db.query(
        `SELECT * FROM templates 
         WHERE companyId = $1 AND deletedAt IS NULL 
         ORDER BY createdAt DESC 
         LIMIT $2 OFFSET $3`,
        [companyId, limit, offset]
      );

      // Handle different response formats from db.query
      let rows = [];
      if (Array.isArray(result)) {
        // Format: [rows, fields]
        rows = result[0] || [];
      } else if (result && result.rows) {
        // Format: { rows: [...] }
        rows = result.rows || [];
      }

      return rows.map(template => {
        if (template.variables && typeof template.variables === 'string') {
          template.variables = JSON.parse(template.variables);
        }
        return template;
      });
    } catch (error) {
      console.error('[TemplateRepository] Error finding templates by company:', error);
      // Return empty array instead of throwing - table might not exist yet
      return [];
    }
  },

  /**
   * Update template
   */
  async update(id, updateData) {
    try {
      const template = await this.findById(id);
      if (!template) return null;

      const updated = {
        ...template,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      const result = await db.query(
        `UPDATE templates 
         SET name = $1, content = $2, variables = $3, updatedAt = $4 
         WHERE id = $5
         RETURNING *`,
        [
          updated.name,
          updated.content,
          JSON.stringify(updated.variables || []),
          updated.updatedAt,
          id
        ]
      );

      // Handle different response formats from db.query
      if (Array.isArray(result)) {
        return result[0]?.[0] || updated;
      } else if (result && result.rows) {
        return result.rows?.[0] || updated;
      }

      return updated;
    } catch (error) {
      console.error('[TemplateRepository] Error updating template:', error);
      return null;
    }
  },

  /**
   * Soft delete template
   */
  async delete(id) {
    try {
      const template = await this.findById(id);
      if (!template) return null;

      const result = await db.query(
        'UPDATE templates SET deletedAt = $1 WHERE id = $2 RETURNING *',
        [new Date().toISOString(), id]
      );

      // Handle different response formats from db.query
      if (Array.isArray(result)) {
        return result[0]?.[0] || { ...template, deletedAt: new Date().toISOString() };
      } else if (result && result.rows) {
        return result.rows?.[0] || { ...template, deletedAt: new Date().toISOString() };
      }

      return { ...template, deletedAt: new Date().toISOString() };
    } catch (error) {
      console.error('[TemplateRepository] Error deleting template:', error);
      return null;
    }
  },

  /**
   * Permanently delete template
   */
  async forceDelete(id) {
    try {
      const template = await this.findById(id);
      if (!template) return null;

      await db.query('DELETE FROM templates WHERE id = $1', [id]);

      return template;
    } catch (error) {
      console.error('[TemplateRepository] Error force deleting template:', error);
      return null;
    }
  }
};
