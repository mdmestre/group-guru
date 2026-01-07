/**
 * Dashboard Routes
 * Endpoints para dados do dashboard
 */

import express from 'express';
import { authenticateJWT, tenantMiddleware } from '../middleware/auth.js';
import { query } from '../database/connection.js';

const router = express.Router();

router.use(authenticateJWT);
router.use(tenantMiddleware);

/**
 * GET /dashboard/metrics
 * Métricas agregadas do dashboard
 */
router.get('/metrics', async (req, res) => {
  try {
    const companyId = req.companyId;

    // Get campaign stats
    const campaignsResult = await query(
      `SELECT 
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)::INTEGER as draft,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)::INTEGER as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::INTEGER as completed,
        SUM(CASE WHEN status = 'completed' THEN sent_count ELSE 0 END)::INTEGER as total_sent,
        SUM(CASE WHEN status = 'completed' THEN delivered_count ELSE 0 END)::INTEGER as total_delivered
      FROM campaigns
      WHERE company_id = $1`,
      [companyId]
    );

    const campaignStats = campaignsResult.rows[0] || {};

    // Get contact stats
    const contactsResult = await query(
      `SELECT 
        COUNT(*)::INTEGER as total,
        SUM(CASE WHEN status = 'lead' THEN 1 ELSE 0 END)::INTEGER as leads,
        SUM(CASE WHEN status = 'customer' THEN 1 ELSE 0 END)::INTEGER as customers,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END)::INTEGER as inactive
      FROM crm_contacts
      WHERE company_id = $1`,
      [companyId]
    );

    const contactStats = contactsResult.rows[0] || {};

    // Get interactions/messages count
    const interactionsResult = await query(
      `SELECT 
        COUNT(*)::INTEGER as total,
        SUM(CASE WHEN direction = 'in' THEN 1 ELSE 0 END)::INTEGER as received,
        SUM(CASE WHEN direction = 'out' THEN 1 ELSE 0 END)::INTEGER as sent,
        SUM(CASE WHEN direction = 'in' AND type = 'message' THEN 1 ELSE 0 END)::INTEGER as messages_received
      FROM crm_interactions
      WHERE company_id = $1`,
      [companyId]
    );

    const interactionStats = interactionsResult.rows[0] || {};

    // Calculate response rate
    const sent = parseInt(interactionStats.sent || 0);
    const received = parseInt(interactionStats.received || 0);
    const responseRate = sent === 0 ? 0 : (received / sent) * 100;

    res.json({
      metrics: {
        messagesTotal: {
          sent: sent,
          received: received,
          trend: 0
        },
        responseRate: {
          rate: Math.round(responseRate * 10) / 10,
          trend: 0
        },
        activeContacts: {
          count: parseInt(contactStats.total || 0),
          trend: 0
        },
        conversions: {
          count: parseInt(campaignStats.completed || 0),
          conversionRate: 0,
          trend: 0
        }
      }
    });
  } catch (error) {
    console.error('[DashboardRoutes] Error getting metrics:', error);
    res.status(500).json({
      error: error.message || 'Failed to get metrics'
    });
  }
});

/**
 * GET /dashboard/activities
 * Atividades recentes
 */
router.get('/activities', async (req, res) => {
  try {
    const companyId = req.companyId;
    const limit = parseInt(req.query.limit || '10');

    const result = await query(
      `SELECT 
        i.id, i.type, i.content as description, i.user_id, i.metadata, 
        i.created_at, c.name as contact_name
      FROM crm_interactions i
      LEFT JOIN crm_contacts c ON i.contact_id = c.id
      WHERE i.company_id = $1
      ORDER BY i.created_at DESC
      LIMIT $2`,
      [companyId, limit]
    );

    const activities = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      description: row.description,
      contactName: row.contact_name,
      userId: row.user_id,
      timestamp: row.created_at,
      metadata: row.metadata
    }));

    res.json({
      activities
    });
  } catch (error) {
    console.error('[DashboardRoutes] Error getting activities:', error);
    res.status(500).json({
      error: error.message || 'Failed to get activities'
    });
  }
});

/**
 * GET /dashboard/connections
 * Status das conexões WhatsApp
 */
router.get('/connections', async (req, res) => {
  try {
    const companyId = req.companyId;

    const result = await query(
      `SELECT 
        id, name, phone_number, status, created_at, updated_at
      FROM whatsapp_connections
      WHERE company_id = $1
      ORDER BY updated_at DESC`,
      [companyId]
    );

    const connections = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone_number,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      connections
    });
  } catch (error) {
    console.error('[DashboardRoutes] Error getting connections:', error);
    res.status(500).json({
      error: error.message || 'Failed to get connections'
    });
  }
});

export default router;
