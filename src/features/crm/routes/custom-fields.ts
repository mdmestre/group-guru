/**
 * Custom Fields Routes
 * API endpoints for custom field management
 */

import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { CustomFieldService } from '../services/CustomFieldService';
import { z } from 'zod';
import { logger } from '@/utils/logger';

const router = Router();

// Validation schemas
const createFieldSchema = z.object({
  name: z.string().min(1).max(255),
  label: z.string().min(1).max(255),
  fieldType: z.enum(['text', 'number', 'select', 'multiselect', 'date', 'checkbox', 'textarea', 'email', 'phone', 'url', 'currency']),
  entityType: z.enum(['contact', 'company', 'deal']),
  description: z.string().optional(),
  isRequired: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  defaultValue: z.string().optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    color: z.string().optional()
  })).optional(),
  validationRules: z.array(z.object({
    type: z.enum(['minLength', 'maxLength', 'pattern', 'custom']),
    value: z.union([z.string(), z.number()]).optional(),
    message: z.string()
  })).optional()
});

const updateFieldSchema = createFieldSchema.omit({ name: true, fieldType: true, entityType: true }).partial();

const setFieldValueSchema = z.object({
  customFieldId: z.string().uuid(),
  value: z.string()
});

const bulkSetValuesSchema = z.object({
  contactIds: z.array(z.string().uuid()),
  customFieldId: z.string().uuid(),
  value: z.string()
});

// Middleware to inject service
const getFieldService = (req: Request): CustomFieldService => {
  return new CustomFieldService(req.app.get('db'));
};

/**
 * GET /api/custom-fields
 * Get all custom fields
 */
router.get(
  '/',
  authenticate,
  authorize('view:custom-fields'),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const entityType = req.query.entityType as string;
      const service = getFieldService(req);

      const fields = await service.getFields(companyId, entityType);

      res.json({
        success: true,
        data: fields,
        count: fields.length
      });
    } catch (error) {
      logger.logError('Error fetching custom fields', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch custom fields'
      });
    }
  }
);

/**
 * GET /api/custom-fields/:id
 * Get specific custom field
 */
router.get(
  '/:id',
  authenticate,
  authorize('view:custom-fields'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const service = getFieldService(req);

      const field = await service.getFieldById(id);
      if (!field) {
        return res.status(404).json({
          success: false,
          error: 'Custom field not found'
        });
      }

      res.json({
        success: true,
        data: field
      });
    } catch (error) {
      logger.logError('Error fetching custom field', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch custom field'
      });
    }
  }
);

/**
 * POST /api/custom-fields
 * Create custom field
 */
router.post(
  '/',
  authenticate,
  authorize('create:custom-fields'),
  validate(createFieldSchema),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const userId = req.user?.id!;
      const service = getFieldService(req);

      const field = await service.createField(companyId, userId, req.body);

      res.status(201).json({
        success: true,
        data: field
      });
    } catch (error) {
      logger.logError('Error creating custom field', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to create custom field'
      });
    }
  }
);

/**
 * PATCH /api/custom-fields/:id
 * Update custom field
 */
router.patch(
  '/:id',
  authenticate,
  authorize('edit:custom-fields'),
  validate(updateFieldSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const service = getFieldService(req);

      const field = await service.updateField(id, req.body);

      res.json({
        success: true,
        data: field
      });
    } catch (error) {
      logger.logError('Error updating custom field', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to update custom field'
      });
    }
  }
);

/**
 * DELETE /api/custom-fields/:id
 * Delete custom field (soft delete)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('delete:custom-fields'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const service = getFieldService(req);

      const deleted = await service.deleteField(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Custom field not found'
        });
      }

      res.json({
        success: true,
        message: 'Custom field deleted'
      });
    } catch (error) {
      logger.logError('Error deleting custom field', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete custom field'
      });
    }
  }
);

/**
 * POST /api/custom-fields/:fieldId/values/:contactId
 * Set field value for contact
 */
router.post(
  '/:fieldId/values/:contactId',
  authenticate,
  authorize('edit:custom-fields'),
  validate(setFieldValueSchema.pick({ value: true })),
  async (req: Request, res: Response) => {
    try {
      const { fieldId, contactId } = req.params;
      const companyId = req.user?.companyId!;
      const service = getFieldService(req);

      const value = await service.setFieldValue(contactId, companyId, {
        customFieldId: fieldId,
        value: req.body.value
      });

      res.json({
        success: true,
        data: value
      });
    } catch (error) {
      logger.logError('Error setting field value', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to set field value'
      });
    }
  }
);

/**
 * GET /api/custom-fields/values/:contactId
 * Get all field values for contact
 */
router.get(
  '/values/:contactId',
  authenticate,
  authorize('view:custom-fields'),
  async (req: Request, res: Response) => {
    try {
      const { contactId } = req.params;
      const service = getFieldService(req);

      const values = await service.getContactFieldValues(contactId);

      res.json({
        success: true,
        data: values,
        count: values.length
      });
    } catch (error) {
      logger.logError('Error fetching field values', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch field values'
      });
    }
  }
);

/**
 * POST /api/custom-fields/bulk-set
 * Bulk set field values for multiple contacts
 */
router.post(
  '/bulk-set',
  authenticate,
  authorize('edit:custom-fields'),
  validate(bulkSetValuesSchema),
  async (req: Request, res: Response) => {
    try {
      const companyId = req.user?.companyId!;
      const { contactIds, customFieldId, value } = req.body;
      const service = getFieldService(req);

      const result = await service.bulkSetFieldValues(
        contactIds,
        companyId,
        customFieldId,
        value
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.logError('Error bulk setting field values', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk set field values'
      });
    }
  }
);

export default router;
