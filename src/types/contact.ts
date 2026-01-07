/**
 * Types para Contatos/Pessoas
 * Alinhados com backend WhatsApp + CRM
 */

export interface Contact {
  id: string;
  jid: string; // WhatsApp JID
  name: string;
  phone: string;
  email?: string;
  profilePictureUrl?: string;
  
  // Engagement
  lastMessageTime?: string;
  messageCount: number;
  isActive: boolean;
  
  // CRM
  organizationId?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface ContactStats {
  total: number;
  active: number;
  inactive: number;
  withMessages: number;
  averageResponseTime?: number;
}

export interface Conversation {
  id: string;
  contactId: string;
  contact: Contact;
  lastMessage?: Message;
  messageCount: number;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  contactId: string;
  direction: 'in' | 'out';
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
}

export interface MessageStats {
  totalSent: number;
  totalReceived: number;
  dailyStats: Record<string, { sent: number; received: number }>;
  averageResponseTime: number;
  responseRate: number;
}
