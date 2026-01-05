/**
 * Validation Schemas
 * Zod schemas for request validation
 */

import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().optional(),
    clientId: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
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
