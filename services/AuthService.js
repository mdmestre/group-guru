/**
 * Auth Service
 * 
 * Business logic for authentication and authorization.
 */

import { UserRepository } from '../database/repositories/UserRepository.js';
import { UserCompanyRepository } from '../database/repositories/UserCompanyRepository.js';
import { CompanyService } from './CompanyService.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'please_change_this_secret_in_production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

export class AuthService {
  /**
   * Register new user and create default company
   */
  static async register({ email, password, name, companyName }) {
    console.log('[AuthService.register] Starting registration', { email });
    
    try {
      // Check if user exists
      console.log('[AuthService.register] Checking if user exists...');
      const existing = await UserRepository.findByEmail(email);
      if (existing) {
        throw new Error('User already exists');
      }

      // Validate company name
      if (!companyName || companyName.trim().length === 0) {
        throw new Error('Company name is required');
      }

      // Create user
      console.log('[AuthService.register] Creating user...');
      const user = await UserRepository.create({ email, password, name });
      console.log('[AuthService.register] User created', { userId: user.id });

      // Create company with provided name (or fallback to generated name)
      const finalCompanyName = companyName.trim() || `${name || email}'s Workspace`;
      console.log('[AuthService.register] Creating company...', { name: finalCompanyName });
      const company = await CompanyService.createCompany({
        name: finalCompanyName,
        userId: user.id,
        trialDays: 14
      });
      console.log('[AuthService.register] Company created', { companyId: company.id });

      // Get user membership
      console.log('[AuthService.register] Getting user membership...');
      const membership = await UserCompanyRepository.findActive(user.id, company.id);
      if (!membership) {
        throw new Error('Failed to create user membership');
      }

      // Generate token
      console.log('[AuthService.register] Generating token...');
      const token = this.generateToken({
        userId: user.id,
        companyId: company.id,
        role: membership.role
      });

      console.log('[AuthService.register] Registration completed successfully');
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug
        },
        role: membership.role
      };
    } catch (error) {
      console.error('[AuthService.register] ERROR:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 10).join('\n')
      });
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login({ email, password, companyId = null }) {
    // Find user
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await UserRepository.verifyPassword(user, password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is disabled');
    }

    // Update last login
    await UserRepository.updateLastLogin(user.id);

    // Get user companies
    const companies = await UserCompanyRepository.findByUserId(user.id);
    if (companies.length === 0) {
      throw new Error('User has no company memberships');
    }

    // Determine active company
    let activeCompanyId = companyId;
    let activeMembership = null;

    if (activeCompanyId) {
      // Verify user has access to this company
      activeMembership = await UserCompanyRepository.findActive(user.id, activeCompanyId);
      if (!activeMembership) {
        throw new Error('Access denied to company');
      }
    } else {
      // Use first company (or could use last accessed)
      activeMembership = companies[0];
      activeCompanyId = activeMembership.company_id;
    }

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      companyId: activeCompanyId,
      role: activeMembership.role
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      company: {
        id: activeCompanyId,
        name: activeMembership.company_name,
        slug: activeMembership.slug
      },
      role: activeMembership.role,
      companies: companies.map(c => ({
        id: c.company_id,
        name: c.company_name,
        slug: c.slug,
        role: c.role
      }))
    };
  }

  /**
   * Switch active company
   */
  static async switchCompany(userId, companyId) {
    // Verify membership
    const membership = await UserCompanyRepository.findActive(userId, companyId);
    if (!membership) {
      throw new Error('Access denied to company');
    }

    // Generate new token with new company
    const token = this.generateToken({
      userId,
      companyId,
      role: membership.role
    });

    return {
      token,
      company: {
        id: companyId,
        name: membership.company_name,
        slug: membership.slug
      },
      role: membership.role
    };
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  /**
   * Get user from token
   */
  static async getUserFromToken(token) {
    try {
      const decoded = this.verifyToken(token);
      const user = await UserRepository.findById(decoded.userId);
      return { user, decoded };
    } catch (error) {
      return { user: null, decoded: null };
    }
  }
}

