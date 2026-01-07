/**
 * Validation Schemas
 * Zod schemas for request validation
 */

import { z } from 'zod';

// Auth schemas - body only
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().optional(),
    companyName: z.string().min(1, 'Company name is required'),
    clientId: z.string().optional(),
  }),
  query: z.record(z.any()).optional(),
  params: z.record(z.any()).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
  query: z.record(z.any()).optional(),
  params: z.record(z.any()).optional(),
});

// Contact schemas
export const createContactSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().min(1, 'Phone is required'),
    email: z.string().email().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const updateContactSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// Campaign schemas
export const createCampaignSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    message: z.string().min(1, 'Message is required'),
    status: z.enum(['draft', 'scheduled', 'active', 'completed']).optional(),
  }),
});

// Message schemas
export const sendMessageSchema = z.object({
  body: z.object({
    phone: z.string().min(1, 'Phone is required'),
    message: z.string().min(1, 'Message is required'),
  }),
});

// Pagination schema
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    search: z.string().optional(),
  }),
});

// Types for TypeScript usage
export type RegisterRequest = z.infer<typeof registerSchema>['body'];
export type LoginRequest = z.infer<typeof loginSchema>['body'];
export type CreateContactRequest = z.infer<typeof createContactSchema>['body'];
export type SendMessageRequest = z.infer<typeof sendMessageSchema>['body'];
