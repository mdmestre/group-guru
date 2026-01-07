/**
 * Contacts Routes
 * Endpoints para gerenciamento de contatos
 */

import express from 'express';
import { authenticateJWT, tenantMiddleware } from '../middleware/auth.js';
import { query } from '../database/connection.js';

const router = express.Router();

router.use(authenticateJWT);
router.use(tenantMiddleware);

/**
 * GET /contacts
 * Listar contatos da empresa
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const { search, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM crm_contacts WHERE company_id = $1';
    let params = [companyId];
    let paramIndex = 2;

    if (search) {
      sql += ` AND (name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as count FROM crm_contacts WHERE company_id = $1';
    let countParams = [companyId];
    if (search) {
      countSql += ` AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)`;
      countParams.push(`%${search}%`);
    }
    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.count || 0);

    const contacts = result.rows.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      status: c.status,
      lastInteractionAt: c.last_interaction_at,
      totalMessages: (c.total_messages_sent || 0) + (c.total_messages_received || 0),
      totalMessagesSent: c.total_messages_sent || 0,
      totalMessagesReceived: c.total_messages_received || 0,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    res.json({
      contacts,
      count: total
    });
  } catch (error) {
    console.error('[ContactsRoutes] Error listing contacts:', error);
    res.status(500).json({
      error: error.message || 'Failed to list contacts'
    });
  }
});

/**
 * GET /contacts/stats
 * Estatísticas de contatos
 */
router.get('/stats', async (req, res) => {
  try {
    const companyId = req.companyId;

    const totalResult = await query(
      'SELECT COUNT(*) as count FROM crm_contacts WHERE company_id = $1',
      [companyId]
    );

    const activeResult = await query(
      `SELECT COUNT(*) as count FROM crm_contacts 
       WHERE company_id = $1 AND status IN ('customer', 'lead')`,
      [companyId]
    );

    const customersResult = await query(
      'SELECT COUNT(*) as count FROM crm_contacts WHERE company_id = $1 AND status = $2',
      [companyId, 'customer']
    );

    const leadsResult = await query(
      'SELECT COUNT(*) as count FROM crm_contacts WHERE company_id = $1 AND status = $2',
      [companyId, 'lead']
    );

    const total = parseInt(totalResult.rows[0]?.count || 0);
    const active = parseInt(activeResult.rows[0]?.count || 0);
    const inactive = total - active;
    const customers = parseInt(customersResult.rows[0]?.count || 0);
    const leads = parseInt(leadsResult.rows[0]?.count || 0);

    res.json({
      stats: {
        total,
        active,
        inactive,
        customers,
        leads,
        averageResponseTime: 0
      }
    });
  } catch (error) {
    console.error('[ContactsRoutes] Error getting stats:', error);
    res.status(500).json({
      error: error.message || 'Failed to get contact stats'
    });
  }
});

/**
 * POST /contacts
 * Criar novo contato
 */
router.post('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const { name, phone, email } = req.body;

    if (!phone) {
      return res.status(400).json({
        error: 'phone is required'
      });
    }

    // Verificar se já existe
    const existing = await query(
      'SELECT id FROM crm_contacts WHERE company_id = $1 AND phone = $2',
      [companyId, phone]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: 'Contact already exists'
      });
    }

    // Criar contato
    const result = await query(
      `INSERT INTO crm_contacts (company_id, name, phone, email, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [companyId, name || null, phone, email || null, 'lead']
    );

    const contact = result.rows[0];

    res.status(201).json({
      success: true,
      contact: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        status: contact.status,
        createdAt: contact.created_at
      }
    });
  } catch (error) {
    console.error('[ContactsRoutes] Error creating contact:', error);
    res.status(500).json({
      error: error.message || 'Failed to create contact'
    });
  }
});

/**
 * GET /contacts/:id
 * Obter contato específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;

    const result = await query(
      'SELECT * FROM crm_contacts WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const c = result.rows[0];
    res.json({
      contact: {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        status: c.status,
        totalMessagesSent: c.total_messages_sent || 0,
        totalMessagesReceived: c.total_messages_received || 0,
        lastInteractionAt: c.last_interaction_at,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }
    });
  } catch (error) {
    console.error('[ContactsRoutes] Error getting contact:', error);
    res.status(500).json({
      error: error.message || 'Failed to get contact'
    });
  }
});

export default router;
