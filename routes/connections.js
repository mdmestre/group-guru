/**
 * WhatsApp Connections Routes
 * Arquitetura correta: rota delega tudo ao service
 */

import express from 'express';
import { WhatsAppConnectionService } from '../services/WhatsAppConnectionService.js';
import {
  createBaileysInstance,
  destroyBaileysInstance,
  getBaileysInstanceStatus,
  setSocketIOServer
} from '../services/BaileysInstanceService.js';
import { authenticateJWT, tenantMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Inicializa Socket.IO no service
 */
export function initializeConnectionsRoutes(io) {
  setSocketIOServer(io);
}

router.use(authenticateJWT);
router.use(tenantMiddleware);

/**
 * GET /connections
 * Lista conexões + status runtime do Baileys
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const connections = await WhatsAppConnectionService.getConnections(companyId);

    const result = connections.map(conn => {
      const runtime = getBaileysInstanceStatus(conn.connection_id);

      return {
        id: conn.id,
        name: conn.name,
        connectionId: conn.connection_id,

        // 🔥 status sempre do runtime
        status: runtime.status,

        qrCode: runtime.qrCode || undefined,
        phoneNumber: runtime.phoneNumber || conn.phone_number || undefined,

        lastActivity: conn.last_activity
          ? new Date(conn.last_activity)
          : undefined,

        createdAt: new Date(conn.created_at),
        errorMessage: runtime.error || conn.error_message || undefined
      };
    });

    res.json({ success: true, connections: result });
  } catch (error) {
    console.error('Error listing connections:', error);
    res.status(500).json({
      error: error.message || 'Failed to list connections'
    });
  }
});

/**
 * GET /connections/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const companyId = req.companyId;
    const stats = await WhatsAppConnectionService.getStats(companyId);

    res.json({ success: true, ...stats });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      error: error.message || 'Failed to get stats'
    });
  }
});

/**
 * POST /connections
 * Cria registro no banco
 */
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const companyId = req.companyId;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const connection = await WhatsAppConnectionService.createConnection({
      companyId,
      name: name.trim()
    });

    res.status(201).json({
      success: true,
      connection: {
        id: connection.id,
        name: connection.name,
        connectionId: connection.connection_id,
        status: connection.status,
        createdAt: new Date(connection.created_at)
      }
    });
  } catch (error) {
    console.error('Error creating connection:', error);

    if (error.message?.includes('Limite')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({
      error: error.message || 'Failed to create connection'
    });
  }
});

/**
 * POST /connections/:id/connect
 * 🔥 SOMENTE inicia a instância
 * QR e status vêm via Socket.IO
 */
router.post('/:id/connect', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;

    const connection = await WhatsAppConnectionService.getConnection(id, companyId);

    // 🔒 Verificar se já existe antes de criar (evita erro 515)
    const existingStatus = getBaileysInstanceStatus(connection.connection_id);
    if (existingStatus.isConnecting || existingStatus.isConnected) {
      console.log(`✅ Instance already active: ${connection.connection_id}`);
      return res.json({
        success: true,
        message: 'Connection already active',
        qrCode: existingStatus.qrCode || null,
        status: existingStatus.status
      });
    }

    // 🔥 Delega tudo ao service (service já tem bloqueio absoluto)
    await createBaileysInstance(connection.connection_id, companyId);

    res.json({
      success: true,
      message: 'Connection started'
    });
  } catch (error) {
    console.error('Error connecting:', error);
    res.status(500).json({
      error: error.message || 'Failed to start connection'
    });
  }
});

/**
 * POST /connections/:id/disconnect
 */
router.post('/:id/disconnect', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;

    const connection = await WhatsAppConnectionService.getConnection(id, companyId);
    await destroyBaileysInstance(connection.connection_id);

    res.json({
      success: true,
      message: 'Connection disconnected'
    });
  } catch (error) {
    console.error('Error disconnecting:', error);
    res.status(500).json({
      error: error.message || 'Failed to disconnect'
    });
  }
});

/**
 * DELETE /connections/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;

    const connection = await WhatsAppConnectionService.getConnection(id, companyId);

    await destroyBaileysInstance(connection.connection_id).catch(() => {});
    await WhatsAppConnectionService.deleteConnection(id, companyId);

    res.json({
      success: true,
      message: 'Connection deleted'
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete connection'
    });
  }
});

export default router;
