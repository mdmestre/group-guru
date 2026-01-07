/**
 * Types para Conexões WhatsApp
 */

export interface WhatsAppConnection {
  id: string;
  connectionId: string;
  name: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  qrCode?: string;
  errorMessage?: string;
  
  messageCount: number;
  contactCount: number;
  
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  
  totalMessages: number;
  messagesPerDay: Record<string, number>;
  
  totalContacts: number;
  contactsPerConnection: Record<string, number>;
  
  lastUpdateTime: string;
}
