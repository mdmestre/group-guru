/**
 * Companies Routes
 * 
 * Company/Workspace management endpoints.
 */

import express from 'express';
import { CompanyService } from '../services/CompanyService.js';
import { authenticateJWT, tenantMiddleware, requireOwnerOrAdmin } from '../middleware/auth.js';
import { getUsageStats } from '../middleware/planLimits.js';
import { SubscriptionRepository } from '../database/repositories/SubscriptionRepository.js';
import { PlanRepository } from '../database/repositories/PlanRepository.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateJWT);

/**
 * POST /companies
 * Create new company
 */
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ error: 'Company name required' });
    }

    const company = await CompanyService.createCompany({
      name,
      userId,
      trialDays: 14
    });

    res.status(201).json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status
      }
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(400).json({ error: error.message || 'Failed to create company' });
  }
});

/**
 * GET /companies
 * List user's companies
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const companies = await CompanyService.getUserCompanies(userId);

    res.json({
      success: true,
      companies: companies.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        role: c.role
      }))
    });
  } catch (error) {
    console.error('List companies error:', error);
    res.status(500).json({ error: 'Failed to list companies' });
  }
});

/**
 * GET /companies/:id
 * Get company details
 */
router.get('/:id', tenantMiddleware, async (req, res) => {
  try {
    const companyId = req.params.id;
    const userId = req.userId;

    // Verify access
    const { UserCompanyRepository } = await import('../database/repositories/UserCompanyRepository.js');
    const membership = await UserCompanyRepository.findActive(userId, companyId);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const company = await CompanyService.getCompanyWithDetails(companyId);

    res.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status,
        trialEndsAt: company.trial_ends_at,
        plan: company.plan_name ? {
          id: company.plan_id,
          name: company.plan_name,
          displayName: company.plan_display_name,
          limits: {
            instances: company.max_instances,
            users: company.max_users,
            dispatchesPerDay: company.max_dispatches_per_day,
            contacts: company.max_contacts,
            automations: company.max_automations
          },
          features: company.features
        } : null
      }
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to get company' });
  }
});

/**
 * PATCH /companies/:id
 * Update company (owner/admin only)
 */
router.patch('/:id', tenantMiddleware, requireOwnerOrAdmin, async (req, res) => {
  try {
    const companyId = req.params.id;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedFields = ['name'];
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const company = await CompanyService.updateCompany(companyId, filteredUpdates);

    res.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug
      }
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(400).json({ error: error.message || 'Failed to update company' });
  }
});

/**
 * GET /companies/:id/usage
 * Get usage statistics vs plan limits
 */
router.get('/:id/usage', tenantMiddleware, async (req, res) => {
  try {
    const companyId = req.params.id;
    const userId = req.userId;

    // Verify access
    const { UserCompanyRepository } = await import('../database/repositories/UserCompanyRepository.js');
    const membership = await UserCompanyRepository.findActive(userId, companyId);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await getUsageStats(companyId);

    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: error.message || 'Failed to get usage stats' });
  }
});

/**
 * GET /companies/:id/plan
 * Get current plan details
 */
router.get('/:id/plan', tenantMiddleware, async (req, res) => {
  try {
    const companyId = req.params.id;
    const subscription = await SubscriptionRepository.findActive(companyId);

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialEndsAt: subscription.trial_ends_at,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        plan: {
          id: subscription.plan_id,
          name: subscription.plan_name,
          displayName: subscription.plan_display_name,
          limits: {
            instances: subscription.max_instances,
            users: subscription.max_users,
            dispatchesPerDay: subscription.max_dispatches_per_day,
            contacts: subscription.max_contacts,
            automations: subscription.max_automations
          },
          features: subscription.features
        }
      }
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

/**
 * GET /plans
 * List available plans
 */
router.get('/plans/available', async (req, res) => {
  try {
    const plans = await PlanRepository.findAllActive();

    res.json({
      success: true,
      plans: plans.map(p => ({
        id: p.id,
        name: p.name,
        displayName: p.display_name,
        description: p.description,
        limits: {
          instances: p.max_instances,
          users: p.max_users,
          dispatchesPerDay: p.max_dispatches_per_day,
          contacts: p.max_contacts,
          automations: p.max_automations
        },
        features: p.features,
        pricing: {
          monthly: p.price_monthly,
          yearly: p.price_yearly,
          currency: p.currency
        }
      }))
    });
  } catch (error) {
    console.error('List plans error:', error);
    res.status(500).json({ error: 'Failed to list plans' });
  }
});

export default router;

