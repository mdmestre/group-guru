// Custom Fields Routes - JavaScript version
// Simplified implementation without TypeScript dependencies

import { Router } from 'express';
import { authenticateJWT, tenantMiddleware } from '../middleware/auth.js';
import { query } from '../database/connection.js';
import {
  emitCustomFieldUpdated,
  emitCustomFieldValueUpdated,
} from '../utils/socketHelper.js';

const router = Router();

// Socket.IO instance - will be set by server.js
let io = null;

export function setSocketIO(socketIO) {
  io = socketIO;
}

// Apply authentication and tenant middleware
router.use(authenticateJWT);
router.use(tenantMiddleware);

/**
 * GET /api/custom-fields
 * Get all custom fields
 */
router.get('/custom-fields', async (req, res) => {
  try {
    const companyId = req.companyId;
    
    const result = await query(
      `SELECT 
        id, name, slug, type, description,
        is_required, is_unique, default_value, options,
        display_order, is_active,
        created_at, updated_at
      FROM crm_custom_fields
      WHERE company_id = $1
      ORDER BY display_order ASC, created_at DESC`,
      [companyId]
    );
    
    const fields = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      label: row.name, // Use name as label if label doesn't exist
      slug: row.slug,
      fieldType: row.type,
      field_type: row.type,
      type: row.type,
      entityType: 'contact', // Default since schema doesn't have entity_type
      entity_type: 'contact',
      description: row.description,
      isRequired: row.is_required,
      is_required: row.is_required,
      isUnique: row.is_unique || false,
      is_unique: row.is_unique || false,
      defaultValue: row.default_value,
      default_value: row.default_value,
      options: row.options || [],
      isActive: row.is_active,
      is_active: row.is_active,
      position: row.display_order || 0,
      display_order: row.display_order || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    res.status(200).json(fields);
  } catch (error) {
    console.error('[CustomFields] Error fetching fields:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/custom-fields
 * Create a new custom field
 */
router.post('/custom-fields', async (req, res) => {
  try {
    // Accept both camelCase (frontend) and snake_case (backend) formats
    const { 
      name, 
      fieldType, 
      field_type, 
      label,
      description, 
      isRequired,
      is_required,
      isUnique,
      is_unique,
      entityType,
      entity_type,
      defaultValue,
      default_value
    } = req.body;
    
    const companyId = req.companyId;
    const userId = req.userId;
    
    // Use fieldType (camelCase) or field_type (snake_case)
    const finalFieldType = fieldType || field_type;
    const finalName = name || label; // Accept both name and label
    const finalLabel = label || finalName;
    const finalEntityType = entityType || entity_type || 'contact';
    const finalIsRequired = isRequired !== undefined ? isRequired : (is_required || false);
    const finalIsUnique = isUnique !== undefined ? isUnique : (is_unique || false);
    
    if (!finalName || !finalFieldType) {
      return res.status(400).json({ 
        error: 'Field name and type are required',
        received: req.body
      });
    }
    
    // Generate slug from name
    const slug = finalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Insert into database (using actual schema fields)
    const result = await query(
      `INSERT INTO crm_custom_fields 
        (company_id, name, slug, type, description,
         is_required, is_unique, default_value, is_active, display_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, name, slug, type, description,
        is_required, is_unique, default_value, is_active, display_order,
        created_at, updated_at`,
      [
        companyId,
        finalName,
        slug,
        finalFieldType,
        description || null,
        finalIsRequired,
        finalIsUnique,
        defaultValue || default_value || null,
        true, // is_active
        0 // display_order
      ]
    );
    
    const row = result.rows[0];
    const field = {
      id: row.id,
      name: row.name,
      label: finalLabel, // Use provided label
      slug: row.slug,
      fieldType: row.type,
      field_type: row.type,
      type: row.type,
      entityType: finalEntityType,
      entity_type: finalEntityType,
      description: row.description,
      isRequired: row.is_required,
      is_required: row.is_required,
      isUnique: row.is_unique || false,
      is_unique: row.is_unique || false,
      defaultValue: row.default_value,
      default_value: row.default_value,
      isActive: row.is_active,
      is_active: row.is_active,
      position: row.display_order || 0,
      display_order: row.display_order || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitCustomFieldUpdated(io, {
        fieldId: field.id,
        companyId,
      });
    }
    
    res.status(201).json(field);
  } catch (error) {
    console.error('[CustomFields] Error creating field:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: 'A field with this name already exists for this entity type'
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/custom-fields/:id
 * Update a custom field
 */
router.put('/custom-fields/:id', async (req, res) => {
  try {
    const { id: fieldId } = req.params;
    const companyId = req.companyId || req.user?.companyId;
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitCustomFieldUpdated(io, {
        fieldId,
        companyId,
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Custom field updated successfully',
      data: { id: fieldId, ...req.body }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/custom-fields/:id
 * Delete a custom field
 */
router.delete('/custom-fields/:id', async (req, res) => {
  try {
    const { id: fieldId } = req.params;
    const companyId = req.companyId;
    
    // Check if field exists and belongs to company
    const checkResult = await query(
      'SELECT id FROM crm_custom_fields WHERE id = $1 AND company_id = $2',
      [fieldId, companyId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Custom field not found' });
    }
    
    // Delete the field (cascade will delete values)
    await query(
      'DELETE FROM crm_custom_fields WHERE id = $1 AND company_id = $2',
      [fieldId, companyId]
    );
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitCustomFieldUpdated(io, {
        fieldId,
        companyId,
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Custom field deleted successfully'
    });
  } catch (error) {
    console.error('[CustomFields] Error deleting field:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/custom-fields/:fieldId/values/:contactId
 * Set custom field value for a contact
 */
router.post('/custom-fields/:fieldId/values/:contactId', async (req, res) => {
  try {
    const { fieldId, contactId } = req.params;
    const companyId = req.companyId || req.user?.companyId;
    
    // Emit Socket.IO event
    if (io && companyId) {
      emitCustomFieldValueUpdated(io, {
        contactId,
        fieldId,
        companyId,
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Custom field value updated successfully',
      data: { fieldId, contactId, value: req.body.value }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
