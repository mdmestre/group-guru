/**
 * Conversations Routes
 * Endpoints para gerenciamento de conversas e mensagens
 */

import express from 'express';
import { authenticateJWT, tenantMiddleware } from '../middleware/auth.js';
import { query } from '../database/connection.js';

const router = express.Router();

router.use(authenticateJWT);
router.use(tenantMiddleware);

/**
 * GET /conversations
 * Listar conversas (interactions) da empresa
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const { search, limit = 50, offset = 0 } = req.query;

    let sql = `SELECT DISTINCT i.contact_id, c.name, c.phone, c.status,
      MAX(i.created_at) as last_interaction,
      COUNT(i.id) as total_interactions,
      COUNT(CASE WHEN i.type = 'message' THEN 1 END) as message_count
      FROM crm_interactions i
      LEFT JOIN crm_contacts c ON i.contact_id = c.id
      WHERE i.company_id = $1`;
    let params = [companyId];
    let paramIndex = 2;

    if (search) {
      sql += ` AND (c.name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` GROUP BY i.contact_id, c.name, c.phone, c.status
      ORDER BY MAX(i.created_at) DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(DISTINCT contact_id) as count 
      FROM crm_interactions WHERE company_id = $1`;
    let countParams = [companyId];
    if (search) {
      countSql += ` AND EXISTS (
        SELECT 1 FROM crm_contacts c 
        WHERE c.id = crm_interactions.contact_id 
        AND (c.name ILIKE $2 OR c.phone ILIKE $2)
      )`;
      countParams.push(`%${search}%`);
    }
    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.count || 0);

    const conversations = result.rows.map(r => ({
      id: r.contact_id,
      contactId: r.contact_id,
      contactName: r.name,
      contactPhone: r.phone,
      messageCount: parseInt(r.message_count || 0),
      totalInteractions: parseInt(r.total_interactions || 0),
      lastInteraction: r.last_interaction,
      unreadCount: 0,
      isPinned: false,
      isMuted: false
    }));

    res.json({
      conversations,
      count: total
    });
  } catch (error) {
    console.error('[ConversationsRoutes] Error listing conversations:', error);
    res.status(500).json({
      error: error.message || 'Failed to list conversations'
    });
  }
});

/**
 * GET /conversations/:id
 * Obter conversa específica
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;

    const result = await query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM crm_interactions i WHERE i.contact_id = c.id AND i.company_id = $1) as total_interactions
       FROM crm_contacts c 
       WHERE c.id = $2 AND c.company_id = $1`,
      [companyId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const c = result.rows[0];
    res.json({
      conversation: {
        id: c.id,
        contactId: c.id,
        contactName: c.name,
        contactPhone: c.phone,
        contactEmail: c.email,
        totalMessages: c.total_messages_sent + c.total_messages_received,
        totalInteractions: parseInt(c.total_interactions || 0),
        lastInteractionAt: c.last_interaction_at,
        unreadCount: 0,
        isPinned: false,
        isMuted: false
      }
    });
  } catch (error) {
    console.error('[ConversationsRoutes] Error getting conversation:', error);
    res.status(500).json({
      error: error.message || 'Failed to get conversation'
    });
  }
});

/**
 * GET /conversations/:id/messages
 * Obter mensagens/interações de uma conversa
 */
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const companyId = req.companyId;

    const result = await query(
      `SELECT * FROM crm_interactions 
       WHERE contact_id = $1 AND company_id = $2 AND type = 'message'
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [id, companyId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query(
      'SELECT COUNT(*) as count FROM crm_interactions WHERE contact_id = $1 AND company_id = $2 AND type = $3',
      [id, companyId, 'message']
    );

    const total = parseInt(countResult.rows[0]?.count || 0);
    const hasMore = (parseInt(offset) + parseInt(limit)) < total;

    const messages = result.rows.reverse().map(m => ({
      id: m.id,
      contactId: m.contact_id,
      type: m.type,
      direction: m.direction,
      text: m.content,
      status: 'sent',
      timestamp: m.created_at
    }));

    res.json({
      messages,
      total,
      hasMore
    });
  } catch (error) {
    console.error('[ConversationsRoutes] Error getting messages:', error);
    res.status(500).json({
      error: error.message || 'Failed to get messages'
    });
  }
});

/**
 * POST /conversations/:id/messages
 * Criar nota/interação
 */
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const companyId = req.companyId;
    const userId = req.userId;

    if (!text) {
      return res.status(400).json({
        error: 'text is required'
      });
    }

    // Verificar se contato existe
    const contactResult = await query(
      'SELECT id FROM crm_contacts WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Criar interação
    const result = await query(
      `INSERT INTO crm_interactions (company_id, contact_id, user_id, type, direction, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [companyId, id, userId, 'message', 'out', text]
    );

    const message = result.rows[0];

    // Atualizar contato com timestamp
    await query(
      'UPDATE crm_contacts SET last_interaction_at = NOW(), total_interactions = total_interactions + 1 WHERE id = $1',
      [id]
    );

    res.status(201).json({
      success: true,
      message: {
        id: message.id,
        contactId: id,
        type: 'message',
        direction: 'out',
        text,
        status: 'sent',
        timestamp: message.created_at
      }
    });
  } catch (error) {
    console.error('[ConversationsRoutes] Error sending message:', error);
    res.status(500).json({
      error: error.message || 'Failed to send message'
    });
  }
});

/**
 * POST /conversations/:id/mark-as-read
 * Marcar conversa como lida
 */
router.post('/:id/mark-as-read', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;

    // Just acknowledge - tracking unread count can be enhanced later
    res.json({ success: true });
  } catch (error) {
    console.error('[ConversationsRoutes] Error marking as read:', error);
    res.status(500).json({
      error: error.message || 'Failed to mark as read'
    });
  }
});

export default router;
