/**
 * Security Middleware
 * Express middleware for security headers and rate limiting
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

/**
 * Security headers middleware (Helmet)
 * Protects against various well-known web vulnerabilities
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * CORS configuration with whitelist
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const whitelist = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
      process.env.VITE_API_URL,
    ].filter(Boolean);

    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

/**
 * Global rate limiter
 * Limits requests to 100 per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Strict rate limiter
 * Limits requests to 5 per 15 minutes (for auth endpoints)
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

/**
 * API rate limiter
 * Limits requests to 500 per hour per user (authenticated)
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return (req.user as any)?.id || req.ip || 'unknown';
  },
  message: 'Too many API requests, please try again later.',
});

export default {
  securityHeaders,
  corsOptions,
  globalLimiter,
  strictLimiter,
  apiLimiter,
};
