/**
 * Company Service
 * 
 * Business logic for companies (workspaces).
 */



import { CompanyRepository } from '../database/repositories/CompanyRepository.js';
import { SubscriptionRepository } from '../database/repositories/SubscriptionRepository.js';
import { UserCompanyRepository } from '../database/repositories/UserCompanyRepository.js';
import { PlanRepository } from '../database/repositories/PlanRepository.js';

export class CompanyService {
  /**
   * Create company with trial subscription
   */
  static async createCompany({ name, userId, trialDays = 14 }) {
    // Generate unique slug
    const slug = await CompanyRepository.generateUniqueSlug(name);

    // Create company with trial status
    const company = await CompanyRepository.create({
      name,
      slug,
      status: 'trial',
      trialDays
    });

    // Get free plan (resilient: try multiple strategies)
    let freePlan = await PlanRepository.findFree();
    
    // Fallback: if 'free' plan not found, try to find any plan with price 0
    if (!freePlan) {
      const allPlans = await PlanRepository.findAll();
      freePlan = allPlans.find(p => 
        p.price_monthly === 0 || 
        p.price_monthly === '0' || 
        parseFloat(p.price_monthly) === 0
      );
    }

    // Final check: if still no free plan, throw detailed error
    if (!freePlan) {
      const availablePlans = await PlanRepository.findAll();
      const planNames = availablePlans.map(p => p.name).join(', ');
      throw new Error(
        `Free plan not found in database. ` +
        `Available plans: ${planNames || 'none'}. ` +
        `Please run migrations to create default plans: node database/migrate.js`
      );
    }

    // Create trial subscription using the plan name from database (not hardcoded)
    await SubscriptionRepository.createTrial({
      companyId: company.id,
      plan: freePlan.name, // Use the actual plan name from database (e.g., 'free')
      trialDays
    });

    // Add user as owner
    await UserCompanyRepository.create({
      userId,
      companyId: company.id,
      role: 'owner',
      allowNoContext: true // Creating initial membership for new company
    });

    return company;
  }

  /**
   * Get company with full details (subscription, plan)
   */
  static async getCompanyWithDetails(companyId) {
    return await CompanyRepository.findWithSubscription(companyId);
  }

  /**
   * Update company
   */
  static async updateCompany(companyId, updates) {
    // If name is being updated, regenerate slug
    if (updates.name) {
      const company = await CompanyRepository.findById(companyId);
      if (company && company.name !== updates.name) {
        updates.slug = await CompanyRepository.generateUniqueSlug(updates.name, companyId);
      }
    }

    return await CompanyRepository.update(companyId, updates);
  }

  /**
   * Check if trial expired and update status
   */
  static async checkAndUpdateTrialStatus(companyId) {
    const company = await CompanyRepository.findById(companyId);
    if (!company || company.status !== 'trial') return false;

    const isExpired = await CompanyRepository.checkTrialExpired(companyId);
    if (isExpired) {
      await CompanyRepository.update(companyId, { status: 'canceled' });
      // Cancel subscription
      const subscription = await SubscriptionRepository.findActive(companyId);
      if (subscription) {
        await SubscriptionRepository.cancel(subscription.id);
      }
      return true;
    }

    return false;
  }

  /**
   * Get companies for user
   */
  static async getUserCompanies(userId) {
    return await CompanyRepository.findByUserId(userId);
  }
}

