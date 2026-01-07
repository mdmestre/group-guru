/**
 * Campaign Types & Interfaces
 * Phase 4: Disparos (Broadcasting)
 */

export interface Campaign {
  id: string;
  companyId: string;
  connectionId: string;
  name: string;
  description?: string;
  type: 'broadcast' | 'scheduled' | 'automated';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  messageTemplate: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  targetFilters: {
    segmentIds?: string[];
    tags?: string[];
    customField?: {
      field: string;
      operator: string;
      value: any;
    };
  };
  recipientsCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  messagesPerMinute: number;
  delayBetweenMessages: number;
  scheduledFor?: Date | string;
  startedAt?: Date | string;
  completedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  contactId: string;
  phone: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  messageId?: string;
  sentAt?: Date | string;
  deliveredAt?: Date | string;
  readAt?: Date | string;
  errorMessage?: string;
}

export interface CampaignTemplate {
  id: string;
  companyId: string;
  name: string;
  content: string;
  variables: string[];
  mediaUrl?: string;
  mediaType?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
  deliveryRate: number;
  successRate: number;
}

export interface CreateCampaignInput {
  connectionId: string;
  name: string;
  description?: string;
  type: 'broadcast' | 'scheduled' | 'automated';
  messageTemplate: string;
  mediaUrl?: string;
  mediaType?: string;
  targetFilters: {
    segmentIds?: string[];
    tags?: string[];
    customField?: {
      field: string;
      operator: string;
      value: any;
    };
  };
  messagesPerMinute?: number;
  delayBetweenMessages?: number;
  scheduledFor?: Date;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  messageTemplate?: string;
  mediaUrl?: string;
  mediaType?: string;
  status?: Campaign['status'];
  messagesPerMinute?: number;
  delayBetweenMessages?: number;
  scheduledFor?: Date;
}

