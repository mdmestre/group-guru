/**
 * Users Routes
 * 
 * User management and invitations.
 */

import express from 'express';
import { UserRepository } from '../database/repositories/UserRepository.js';
import { UserCompanyRepository } from '../database/repositories/UserCompanyRepository.js';
import { authenticateJWT, tenantMiddleware, requireOwnerOrAdmin, checkUserLimit } from '../middleware/auth.js';
import { checkUserLimit as checkUserLimitMiddleware } from '../middleware/planLimits.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateJWT);
router.use(tenantMiddleware);

/**
 * GET /users
 * List company members
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const members = await UserCompanyRepository.findByCompanyId(companyId);

    res.json({
      success: true,
      members: members.map(m => ({
        id: m.user_id,
        email: m.user_email,
        name: m.user_name,
        role: m.role,
        joinedAt: m.joined_at,
        emailVerified: m.email_verified
      }))
    });
  } catch (error) {
    console.error('List members error:', error);
    res.status(500).json({ error: 'Failed to list members' });
  }
});

/**
 * POST /users/invite
 * Invite user to company (owner/admin only, with plan limit check)
 */
router.post('/invite', requireOwnerOrAdmin, checkUserLimitMiddleware, async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    const companyId = req.companyId;
    const inviterId = req.userId;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Validate role
    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Find or create user
    let user = await UserRepository.findByEmail(email);
    if (!user) {
      // Create user account (they'll need to set password on first login)
      // For now, we'll require them to register first
      return res.status(404).json({ 
        error: 'User not found. User must register first.' 
      });
    }

    // Check if user is already a member
    const existing = await UserCompanyRepository.find(user.id, companyId);
    if (existing) {
      if (existing.is_active) {
        return res.status(400).json({ error: 'User is already a member' });
      } else {
        // Reactivate membership
        await UserCompanyRepository.update(user.id, companyId, {
          is_active: true,
          role,
          invited_by: inviterId,
          invited_at: new Date(),
          joined_at: null
        });

        return res.json({
          success: true,
          message: 'Invitation sent',
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        });
      }
    }

    // Create invitation
    const membership = await UserCompanyRepository.create({
      userId: user.id,
      companyId,
      role,
      invitedBy: inviterId
    });

    // TODO: Send invitation email

    res.status(201).json({
      success: true,
      message: 'Invitation sent',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      membership: {
        id: membership.id,
        role: membership.role,
        invitedAt: membership.invited_at
      }
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(400).json({ error: error.message || 'Failed to invite user' });
  }
});

/**
 * POST /users/:userId/accept-invitation
 * Accept company invitation
 */
router.post('/:userId/accept-invitation', async (req, res) => {
  try {
    const userId = req.params.userId;
    const companyId = req.body.companyId || req.companyId;
    const currentUserId = req.userId;

    // Verify user can accept their own invitation
    if (userId !== currentUserId) {
      return res.status(403).json({ error: 'Can only accept your own invitations' });
    }

    const membership = await UserCompanyRepository.acceptInvitation(userId, companyId);

    if (!membership) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json({
      success: true,
      message: 'Invitation accepted',
      membership: {
        companyId: membership.company_id,
        role: membership.role
      }
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(400).json({ error: error.message || 'Failed to accept invitation' });
  }
});

/**
 * PATCH /users/:userId/role
 * Update user role (owner/admin only)
 */
router.patch('/:userId/role', requireOwnerOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const companyId = req.companyId;
    const currentUserId = req.userId;

    // Prevent changing own role
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Validate role
    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Cannot change owner role (only through transfer)
    const membership = await UserCompanyRepository.find(userId, companyId);
    if (membership && membership.role === 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    await UserCompanyRepository.update(userId, companyId, { role });

    res.json({
      success: true,
      message: 'Role updated'
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(400).json({ error: error.message || 'Failed to update role' });
  }
});

/**
 * DELETE /users/:userId
 * Remove user from company (owner/admin only)
 */
router.delete('/:userId', requireOwnerOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.companyId;
    const currentUserId = req.userId;

    // Prevent removing self
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    // Cannot remove owner
    const membership = await UserCompanyRepository.find(userId, companyId);
    if (membership && membership.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove owner' });
    }

    await UserCompanyRepository.remove(userId, companyId);

    res.json({
      success: true,
      message: 'User removed from company'
    });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(400).json({ error: error.message || 'Failed to remove user' });
  }
});

export default router;

