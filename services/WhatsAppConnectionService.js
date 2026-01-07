/**
 * WhatsApp Connection Service
 * 
 * Business logic for WhatsApp connections.
 */

import { WhatsAppConnectionRepository } from '../database/repositories/WhatsAppConnectionRepository.js';
import { PlanLimitService } from '../middleware/planLimits.js';
import { SubscriptionRepository } from '../database/repositories/SubscriptionRepository.js';

export class WhatsAppConnectionService {
  /**
   * Create a new connection
   * Validates plan limits before creating
   */
  static async createConnection({ companyId, name }) {
    // Get subscription and plan limits
    const subscription = await SubscriptionRepository.findActive(companyId);
    if (!subscription) {
      throw new Error('Sua empresa não possui um plano ativo. Ative um plano para conectar WhatsApp.');
    }

    const maxInstances = subscription.max_instances || 10; // Default fallback
    
    // Check if company can create more connections
    const canCreate = await WhatsAppConnectionRepository.canCreateConnection(
      companyId, 
      maxInstances
    );

    if (!canCreate) {
      throw new Error(`Limite de instâncias atingido. Seu plano permite até ${maxInstances} instâncias.`);
    }

    // Create connection
    const connection = await WhatsAppConnectionRepository.create({ companyId, name });

    return connection;
  }

  /**
   * Get all connections for a company
   */
  static async getConnections(companyId) {
    return await WhatsAppConnectionRepository.findByCompanyId(companyId);
  }

  /**
   * Get connection by ID (with company validation)
   */
  static async getConnection(id, companyId) {
    const connection = await WhatsAppConnectionRepository.findById(id);
    
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.company_id !== companyId) {
      throw new Error('Access denied');
    }

    return connection;
  }

  /**
   * Update connection status
   */
  static async updateStatus(connectionId, status, metadata = {}) {
    const connection = await WhatsAppConnectionRepository.findByConnectionId(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    return await WhatsAppConnectionRepository.updateStatus(connection.id, status, metadata);
  }

  /**
   * Update connection by connection_id (used by Baileys handlers)
   */
  static async updateByConnectionId(connectionId, updates) {
    return await WhatsAppConnectionRepository.updateByConnectionId(connectionId, updates);
  }

  /**
   * Delete connection
   */
  static async deleteConnection(id, companyId) {
    const connection = await WhatsAppConnectionRepository.findById(id);
    
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.company_id !== companyId) {
      throw new Error('Access denied');
    }

    await WhatsAppConnectionRepository.delete(id);
  }

  /**
   * Update connection name
   */
  static async updateName(id, companyId, name) {
    const connection = await WhatsAppConnectionRepository.findById(id);
    
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.company_id !== companyId) {
      throw new Error('Access denied');
    }

    return await WhatsAppConnectionRepository.update(id, { name });
  }

  /**
   * Get connection stats for company
   */
  static async getStats(companyId) {
    const connections = await WhatsAppConnectionRepository.findByCompanyId(companyId);
    const activeCount = await WhatsAppConnectionRepository.countActiveByCompanyId(companyId);
    
    // Get plan limits
    const subscription = await SubscriptionRepository.findActive(companyId);
    const maxInstances = subscription?.max_instances || 10; // Default fallback

    return {
      total: connections.length,
      active: activeCount,
      limit: maxInstances,
      remaining: Math.max(0, maxInstances - connections.length)
    };
  }
}

