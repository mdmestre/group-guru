/**
 * Custom Fields Service
 * Handles custom field definitions and values for contacts
 */

import { logger } from '@/utils/logger';
import type {
  CustomField,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
  CustomFieldValue,
  CustomFieldValueInput
} from '../models/custom-fields';

export class CustomFieldService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Create custom field
   */
  async createField(
    companyId: string,
    userId: string,
    input: CreateCustomFieldInput
  ): Promise<CustomField> {
    try {
      const query = `
        INSERT INTO crm_custom_fields (
          company_id, name, label, field_type, entity_type,
          description, is_required, is_unique, default_value,
          options, validation_rules, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;

      const result = await this.db.query(query, [
        companyId,
        input.name,
        input.label,
        input.fieldType,
        input.entityType,
        input.description || null,
        input.isRequired || false,
        input.isUnique || false,
        input.defaultValue || null,
        input.options ? JSON.stringify(input.options) : null,
        input.validationRules ? JSON.stringify(input.validationRules) : null,
        userId
      ]);

      logger.logInfo('Custom field created', {
        fieldId: result.rows[0].id,
        companyId,
        name: input.name
      });

      return result.rows[0];
    } catch (error) {
      logger.logError('Error creating custom field', error as Error, { companyId });
      throw new Error('Failed to create custom field');
    }
  }

  /**
   * Get all custom fields for company
   */
  async getFields(
    companyId: string,
    entityType?: string
  ): Promise<CustomField[]> {
    try {
      let query = `
        SELECT * FROM crm_custom_fields 
        WHERE company_id = $1 AND is_active = true
      `;
      const params: any[] = [companyId];

      if (entityType) {
        query += ` AND entity_type = $${params.length + 1}`;
        params.push(entityType);
      }

      query += ` ORDER BY position ASC, created_at ASC;`;

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.logError('Error fetching custom fields', error as Error, { companyId });
      throw new Error('Failed to fetch custom fields');
    }
  }

  /**
   * Get field by ID
   */
  async getFieldById(fieldId: string): Promise<CustomField | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM crm_custom_fields WHERE id = $1;`,
        [fieldId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.logError('Error fetching custom field', error as Error, { fieldId });
      throw new Error('Failed to fetch custom field');
    }
  }

  /**
   * Update custom field
   */
  async updateField(
    fieldId: string,
    input: UpdateCustomFieldInput
  ): Promise<CustomField> {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (input.label !== undefined) {
        updates.push(`label = $${paramIndex++}`);
        params.push(input.label);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(input.description);
      }
      if (input.isRequired !== undefined) {
        updates.push(`is_required = $${paramIndex++}`);
        params.push(input.isRequired);
      }
      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(input.isActive);
      }
      if (input.options !== undefined) {
        updates.push(`options = $${paramIndex++}`);
        params.push(JSON.stringify(input.options));
      }
      if (input.validationRules !== undefined) {
        updates.push(`validation_rules = $${paramIndex++}`);
        params.push(JSON.stringify(input.validationRules));
      }

      if (updates.length === 0) {
        return this.getFieldById(fieldId) as Promise<CustomField>;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(fieldId);

      const query = `
        UPDATE crm_custom_fields 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *;
      `;

      const result = await this.db.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.logError('Error updating custom field', error as Error, { fieldId });
      throw new Error('Failed to update custom field');
    }
  }

  /**
   * Delete custom field
   */
  async deleteField(fieldId: string): Promise<boolean> {
    try {
      // Soft delete
      const result = await this.db.query(
        `UPDATE crm_custom_fields SET is_active = false WHERE id = $1;`,
        [fieldId]
      );
      return result.rowCount > 0;
    } catch (error) {
      logger.logError('Error deleting custom field', error as Error, { fieldId });
      throw new Error('Failed to delete custom field');
    }
  }

  /**
   * Set custom field value for contact
   */
  async setFieldValue(
    contactId: string,
    companyId: string,
    input: CustomFieldValueInput
  ): Promise<CustomFieldValue> {
    try {
      // Validate field exists and belongs to company
      const field = await this.db.query(
        `SELECT * FROM crm_custom_fields WHERE id = $1 AND company_id = $2;`,
        [input.customFieldId, companyId]
      );

      if (field.rows.length === 0) {
        throw new Error('Custom field not found');
      }

      // Validate value if rules exist
      if (field.rows[0].validation_rules) {
        const isValid = await this.validateValue(
          input.value,
          field.rows[0].validation_rules
        );
        if (!isValid) {
          throw new Error('Invalid field value');
        }
      }

      // Insert or update
      const query = `
        INSERT INTO crm_custom_field_values (
          contact_id, custom_field_id, company_id, value
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (contact_id, custom_field_id) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const result = await this.db.query(query, [
        contactId,
        input.customFieldId,
        companyId,
        input.value
      ]);

      return result.rows[0];
    } catch (error) {
      logger.logError('Error setting field value', error as Error, { contactId });
      throw error;
    }
  }

  /**
   * Get all custom field values for contact
   */
  async getContactFieldValues(contactId: string): Promise<CustomFieldValue[]> {
    try {
      const result = await this.db.query(
        `
          SELECT cfv.* FROM crm_custom_field_values cfv
          WHERE cfv.contact_id = $1
          ORDER BY cfv.created_at DESC;
        `,
        [contactId]
      );
      return result.rows;
    } catch (error) {
      logger.logError('Error fetching field values', error as Error, { contactId });
      throw new Error('Failed to fetch field values');
    }
  }

  /**
   * Get field value for contact
   */
  async getFieldValue(
    contactId: string,
    fieldId: string
  ): Promise<CustomFieldValue | null> {
    try {
      const result = await this.db.query(
        `
          SELECT * FROM crm_custom_field_values 
          WHERE contact_id = $1 AND custom_field_id = $2;
        `,
        [contactId, fieldId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.logError('Error fetching field value', error as Error, {
        contactId,
        fieldId
      });
      throw new Error('Failed to fetch field value');
    }
  }

  /**
   * Validate value against field's validation rules
   */
  private async validateValue(value: string, rules: any[]): Promise<boolean> {
    for (const rule of rules) {
      switch (rule.type) {
        case 'minLength':
          if (value.length < rule.value) return false;
          break;
        case 'maxLength':
          if (value.length > rule.value) return false;
          break;
        case 'pattern':
          const regex = new RegExp(rule.value);
          if (!regex.test(value)) return false;
          break;
        default:
          continue;
      }
    }
    return true;
  }

  /**
   * Bulk update field values
   */
  async bulkSetFieldValues(
    contactIds: string[],
    companyId: string,
    fieldId: string,
    value: string
  ): Promise<{ updated: number }> {
    try {
      const query = `
        INSERT INTO crm_custom_field_values (contact_id, custom_field_id, company_id, value)
        SELECT unnest($1::uuid[]), $2, $3, $4
        ON CONFLICT (contact_id, custom_field_id) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP;
      `;

      const result = await this.db.query(query, [
        contactIds,
        fieldId,
        companyId,
        value
      ]);

      logger.logInfo('Bulk field values updated', {
        count: result.rowCount,
        fieldId,
        companyId
      });

      return { updated: result.rowCount };
    } catch (error) {
      logger.logError('Error bulk updating field values', error as Error);
      throw new Error('Failed to bulk update field values');
    }
  }
}
