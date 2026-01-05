/**
 * Auth Routes
 * 
 * Authentication endpoints.
 */

import express from 'express';
import { AuthService } from '../services/AuthService.js';
import { authenticateJWT, tenantMiddleware } from '../middleware/auth.js';
import { validate } from '../src/middleware/validation.js';
import { registerSchema, loginSchema } from '../src/utils/validation/schemas.js';

const router = express.Router();

/**
 * POST /auth/register
 * Register new user and create default company
 */
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    console.log('[Register] Request received', { email: req.body?.email, hasCompanyName: !!req.body?.companyName });
    
    const { email, password, name, companyName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!companyName || companyName.trim().length === 0) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    console.log('[Register] Calling AuthService.register...');
    const result = await AuthService.register({ email, password, name, companyName });
    console.log('[Register] Registration successful', { userId: result.user?.id, companyId: result.company?.id });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Register] ERROR:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      name: error.name
    });
    
    // Ensure we always return a proper error response
    const statusCode = error.message?.includes('company context') ? 500 : 400;
    res.status(statusCode).json({ 
      error: error.message || 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /auth/login
 * Login user
 */
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password, companyId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await AuthService.login({ email, password, companyId });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Invalid credentials' });
  }
});

/**
 * POST /auth/switch-company
 * Switch active company (requires auth)
 */
router.post('/switch-company', authenticateJWT, async (req, res) => {
  try {
    const { companyId } = req.body;
    const userId = req.userId;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    const result = await AuthService.switchCompany(userId, companyId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Switch company error:', error);
    res.status(403).json({ error: error.message || 'Failed to switch company' });
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authenticateJWT, tenantMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const companyId = req.companyId;
    const role = req.role;

    // Import here to avoid circular dependencies
    const { UserRepository } = await import('../database/repositories/UserRepository.js');
    const { CompanyRepository } = await import('../database/repositories/CompanyRepository.js');
    const { UserCompanyRepository } = await import('../database/repositories/UserCompanyRepository.js');

    const user = await UserRepository.findById(userId);
    const company = await CompanyRepository.findById(companyId);
    const membership = await UserCompanyRepository.findActive(userId, companyId);
    const userCompanies = await UserCompanyRepository.findByUserId(userId);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status
      },
      role: membership.role,
      companies: userCompanies.map(uc => ({
        id: uc.company_id,
        name: uc.company_name,
        slug: uc.slug,
        role: uc.role
      }))
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;

