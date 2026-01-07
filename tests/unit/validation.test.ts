/**
 * Validation Tests
 */

import { registerSchema, loginSchema, createContactSchema } from '../../src/utils/validation/schemas.js';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct register data', () => {
      const data = {
        body: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      };
      expect(() => registerSchema.parse(data)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const data = {
        body: {
          email: 'invalid-email',
          password: 'password123',
        },
      };
      expect(() => registerSchema.parse(data)).toThrow();
    });

    it('should reject short password', () => {
      const data = {
        body: {
          email: 'test@example.com',
          password: 'short',
        },
      };
      expect(() => registerSchema.parse(data)).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };
      expect(() => loginSchema.parse(data)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const data = {
        body: {
          email: 'invalid',
          password: 'password123',
        },
      };
      expect(() => loginSchema.parse(data)).toThrow();
    });
  });

  describe('createContactSchema', () => {
    it('should validate correct contact data', () => {
      const data = {
        body: {
          name: 'John Doe',
          phone: '1234567890',
          email: 'john@example.com',
        },
      };
      expect(() => createContactSchema.parse(data)).not.toThrow();
    });

    it('should reject missing name', () => {
      const data = {
        body: {
          phone: '1234567890',
        },
      };
      expect(() => createContactSchema.parse(data)).toThrow();
    });

    it('should reject missing phone', () => {
      const data = {
        body: {
          name: 'John Doe',
        },
      };
      expect(() => createContactSchema.parse(data)).toThrow();
    });
  });
});
