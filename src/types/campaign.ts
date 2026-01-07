/**
 * Types para Campanhas
 */

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: 'broadcast' | 'automation' | 'scheduled';
  
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  
  messageTemplate: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
  
  targetFilters?: Record<string, unknown>;
  messagesPerMinute: number;
  delayBetweenMessages: number;
  
  connectionId: string;
  
  // Stats
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  readCount: number;
  
  // Timing
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  contactId: string;
  contact?: {
    id: string;
    name: string;
    phone: string;
  };
  
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failureReason?: string;
}

export interface CampaignStats {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  
  deliveryRate: number; // percentage
  readRate: number; // percentage
  failureRate: number; // percentage
  
  avgDeliveryTime?: number; // ms
  avgReadTime?: number; // ms
}

export interface CampaignListItem extends Campaign {
  stats?: CampaignStats;
}
