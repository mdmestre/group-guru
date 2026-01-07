/**
 * Types para Dashboard
 */

export interface DashboardMetrics {
  messagesTotal: {
    sent: number;
    received: number;
    trend: number; // percentage change vs previous period
  };
  
  responseRate: {
    rate: number; // percentage
    trend: number; // percentage change
  };
  
  activeContacts: {
    count: number;
    trend: number; // percentage change
  };
  
  conversions: {
    count: number;
    conversionRate: number;
    trend: number; // percentage change
  };
}

export interface DashboardActivity {
  id: string;
  type: 'message_received' | 'message_sent' | 'contact_added' | 'campaign_launched' | 'campaign_completed';
  description: string;
  contactName?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardConnectionStatus {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastActivity: string;
  messageCount: number;
  contactCount: number;
}
