/**
 * Campaign Service
 * API calls for campaign management
 */

import { ApiClient } from '@/services/apiClient';
import type {
  Campaign,
  CampaignTemplate,
  CampaignStats,
  CampaignRecipient,
  CreateCampaignInput,
  UpdateCampaignInput
} from '../models/types';

export const campaignService = {
  // Campanhas
  list: async (): Promise<Campaign[]> => {
    const response = await ApiClient.get<{ success: boolean; campaigns: Campaign[] }>('/campaigns');
    return response.campaigns || [];
  },

  get: async (id: string): Promise<Campaign> => {
    const response = await ApiClient.get<{ success: boolean; campaign: Campaign }>(`/campaigns/${id}`);
    return response.campaign;
  },

  create: async (data: CreateCampaignInput): Promise<Campaign> => {
    const response = await ApiClient.post<{ success: boolean; campaign: Campaign }>(
      '/campaigns',
      data
    );
    return response.campaign;
  },

  update: async (id: string, data: Partial<UpdateCampaignInput>): Promise<Campaign> => {
    const response = await ApiClient.patch<{ success: boolean; campaign: Campaign }>(
      `/campaigns/${id}`,
      data
    );
    return response.campaign;
  },

  delete: async (id: string): Promise<void> => {
    await ApiClient.delete(`/campaigns/${id}`);
  },

  launch: async (id: string): Promise<Campaign> => {
    const response = await ApiClient.post<{ success: boolean; campaign: Campaign }>(
      `/campaigns/${id}/launch`,
      {}
    );
    return response.campaign;
  },

  pause: async (id: string): Promise<Campaign> => {
    const response = await ApiClient.post<{ success: boolean; campaign: Campaign }>(
      `/campaigns/${id}/pause`,
      {}
    );
    return response.campaign;
  },

  resume: async (id: string): Promise<Campaign> => {
    const response = await ApiClient.post<{ success: boolean; campaign: Campaign }>(
      `/campaigns/${id}/resume`,
      {}
    );
    return response.campaign;
  },

  cancel: async (id: string): Promise<Campaign> => {
    const response = await ApiClient.post<{ success: boolean; campaign: Campaign }>(
      `/campaigns/${id}/cancel`,
      {}
    );
    return response.campaign;
  },

  getStats: async (id: string): Promise<CampaignStats> => {
    const response = await ApiClient.get<{ success: boolean; stats: CampaignStats }>(
      `/campaigns/${id}/stats`
    );
    return response.stats;
  },

  getRecipients: async (id: string): Promise<CampaignRecipient[]> => {
    const response = await ApiClient.get<{ success: boolean; recipients: CampaignRecipient[] }>(
      `/campaigns/${id}/recipients`
    );
    return response.recipients || [];
  },

  // Templates
  listTemplates: async (): Promise<CampaignTemplate[]> => {
    try {
      const response = await ApiClient.get<{ success: boolean; templates: CampaignTemplate[] }>('/campaigns/templates');
      
      // Safely extract templates array
      if (!response) {
        return [];
      }
      
      // Handle both array and object response
      if (Array.isArray(response)) {
        return response;
      }
      
      // Handle object with templates property
      if (response.templates && Array.isArray(response.templates)) {
        return response.templates;
      }
      
      // Return empty array if nothing found
      return [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Return empty array instead of throwing - allows graceful degradation
      return [];
    }
  },

  getTemplate: async (id: string): Promise<CampaignTemplate> => {
    const response = await ApiClient.get<{ template: CampaignTemplate }>(`/campaigns/templates/${id}`);
    // Handle both direct object and wrapped response
    if ('template' in response) {
      return response.template;
    }
    return response as CampaignTemplate;
  },

  createTemplate: async (data: Partial<CampaignTemplate>): Promise<CampaignTemplate> => {
    const response = await ApiClient.post<{ template: CampaignTemplate }>(
      '/campaigns/templates',
      data
    );
    if ('template' in response) {
      return response.template;
    }
    return response as CampaignTemplate;
  },

  updateTemplate: async (id: string, data: Partial<CampaignTemplate>): Promise<CampaignTemplate> => {
    const response = await ApiClient.patch<{ template: CampaignTemplate }>(
      `/campaigns/templates/${id}`,
      data
    );
    if ('template' in response) {
      return response.template;
    }
    return response as CampaignTemplate;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await ApiClient.delete(`/campaigns/templates/${id}`);
  }
};

