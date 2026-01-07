/**
 * Plan Limits Middleware
 * 
 * Enforce plan limits (instances, dispatches, users, etc.)
 */

import { SubscriptionRepository } from '../database/repositories/SubscriptionRepository.js';
import { UsageRepository } from '../database/repositories/UsageRepository.js';
import { UserCompanyRepository } from '../database/repositories/UserCompanyRepository.js';

/**
 * Check if company can perform action based on plan limits
 */
export class PlanLimitService {
  /**
   * Get company subscription with limits
   */
  static async getLimits(companyId) {
    const subscription = await SubscriptionRepository.findActive(companyId);
    
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    // Check trial expiration
    if (subscription.status === 'trial' && subscription.trial_ends_at) {
      const trialEnds = new Date(subscription.trial_ends_at);
      if (new Date() > trialEnds) {
        throw new Error('Trial period has expired');
      }
    }

    return {
      planId: subscription.plan_id,
      planName: subscription.plan_name,
      maxInstances: subscription.max_instances,
      maxUsers: subscription.max_users,
      maxDispatchesPerDay: subscription.max_dispatches_per_day,
      maxContacts: subscription.max_contacts,
      maxAutomations: subscription.max_automations,
      features: subscription.features || {}
    };
  }

  /**
   * Check instance limit
   */
  static async checkInstanceLimit(companyId, currentCount) {
    const limits = await this.getLimits(companyId);
    
    if (limits.maxInstances === null) return true; // Unlimited
    return currentCount < limits.maxInstances;
  }

  /**
   * Check dispatch limit (messages per day)
   */
  static async checkDispatchLimit(companyId, additionalCount = 1) {
    const limits = await this.getLimits(companyId);
    const usage = await UsageRepository.getTodayUsage(companyId);
    
    const total = (usage.dispatches_count || 0) + additionalCount;
    
    if (limits.maxDispatchesPerDay === null) return true; // Unlimited
    return total <= limits.maxDispatchesPerDay;
  }

  /**
   * Check user limit
   */
  static async checkUserLimit(companyId, additionalCount = 1) {
    const limits = await this.getLimits(companyId);
    
    if (limits.maxUsers === null) return true; // Unlimited
    
    const members = await UserCompanyRepository.findByCompanyId(companyId);
    const total = members.length + additionalCount;
    
    return total <= limits.maxUsers;
  }

  /**
   * Check contact limit
   */
  static async checkContactLimit(companyId, currentCount, additionalCount = 1) {
    const limits = await this.getLimits(companyId);
    
    if (limits.maxContacts === null) return true; // Unlimited
    return (currentCount + additionalCount) <= limits.maxContacts;
  }

  /**
   * Check automation limit
   */
  static async checkAutomationLimit(companyId, currentCount, additionalCount = 1) {
    const limits = await this.getLimits(companyId);
    
    if (limits.maxAutomations === null) return true; // Unlimited
    return (currentCount + additionalCount) <= limits.maxAutomations;
  }
}

/**
 * Middleware: Check dispatch limit before action
 */
export function checkDispatchLimit(req, res, next) {
  const companyId = req.companyId;
  
  PlanLimitService.checkDispatchLimit(companyId, 1)
    .then(canDispatch => {
      if (!canDispatch) {
        return res.status(403).json({ 
          error: 'Daily dispatch limit reached',
          code: 'DISPATCH_LIMIT_EXCEEDED'
        });
      }
      next();
    })
    .catch(error => {
      console.error('Error checking dispatch limit:', error);
      return res.status(500).json({ error: 'Error checking limits' });
    });
}

/**
 * Middleware: Check instance limit
 */
export function checkInstanceLimit(req, res, next) {
  const companyId = req.companyId;
  
  // Get current instance count from request or check in DB
  const currentCount = req.body?.currentInstances || 0;
  
  PlanLimitService.checkInstanceLimit(companyId, currentCount)
    .then(canCreate => {
      if (!canCreate) {
        return res.status(403).json({ 
          error: 'Instance limit reached',
          code: 'INSTANCE_LIMIT_EXCEEDED'
        });
      }
      next();
    })
    .catch(error => {
      console.error('Error checking instance limit:', error);
      return res.status(500).json({ error: 'Error checking limits' });
    });
}

/**
 * Middleware: Check user limit before inviting
 */
export function checkUserLimit(req, res, next) {
  const companyId = req.companyId;
  
  PlanLimitService.checkUserLimit(companyId, 1)
    .then(canInvite => {
      if (!canInvite) {
        return res.status(403).json({ 
          error: 'User limit reached for current plan',
          code: 'USER_LIMIT_EXCEEDED'
        });
      }
      next();
    })
    .catch(error => {
      console.error('Error checking user limit:', error);
      return res.status(500).json({ error: 'Error checking limits' });
    });
}

/**
 * Get usage vs limits for company
 */
export async function getUsageStats(companyId) {
  const limits = await PlanLimitService.getLimits(companyId);
  const usage = await UsageRepository.getTodayUsage(companyId);
  const members = await UserCompanyRepository.findByCompanyId(companyId);

  return {
    plan: {
      name: limits.planName,
      id: limits.planId
    },
    limits: {
      instances: limits.maxInstances,
      users: limits.maxUsers,
      dispatchesPerDay: limits.maxDispatchesPerDay,
      contacts: limits.maxContacts,
      automations: limits.maxAutomations
    },
    usage: {
      instances: usage.instances_active || 0,
      users: members.length,
      dispatchesToday: usage.dispatches_count || 0
    },
    remaining: {
      instances: limits.maxInstances ? limits.maxInstances - (usage.instances_active || 0) : null,
      users: limits.maxUsers ? limits.maxUsers - members.length : null,
      dispatchesToday: limits.maxDispatchesPerDay ? limits.maxDispatchesPerDay - (usage.dispatches_count || 0) : null
    }
  };
}

