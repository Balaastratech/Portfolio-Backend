import { Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { adminUsers, UserPermissions, SUPER_ADMIN_PERMISSIONS } from '../../db/schema.js';

// ============================================================================
// Validation Schemas
// ============================================================================

export const updateUserSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    status: z.enum(['pending', 'active', 'suspended']).optional(),
    role: z.enum(['admin', 'super_admin']).optional(),
    permissions: z.object({
        dashboard: z.boolean(),
        projects: z.boolean(),
        services: z.boolean(),
        capabilities: z.boolean(),
        clientFit: z.boolean(),
        process: z.boolean(),
        about: z.boolean(),
        techStack: z.boolean(),
        trustSignals: z.boolean(),
        media: z.boolean(),
        inbox: z.boolean(),
        siteConfig: z.boolean(),
        formOptions: z.boolean(),
        users: z.boolean(),
    }).optional(),
});

// ============================================================================
// Controllers
// ============================================================================

/**
 * GET /admin/users
 * List all users (super_admin only)
 */
export async function getUsers(_req: Request, res: Response): Promise<void> {
    try {
        const users = await db
            .select({
                id: adminUsers.id,
                email: adminUsers.email,
                name: adminUsers.name,
                role: adminUsers.role,
                status: adminUsers.status,
                permissions: adminUsers.permissions,
                isEmailVerified: adminUsers.isEmailVerified,
                lastLogin: adminUsers.lastLogin,
                createdAt: adminUsers.createdAt,
            })
            .from(adminUsers)
            .orderBy(desc(adminUsers.createdAt));

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch users',
        });
    }
}

/**
 * GET /admin/users/:id
 * Get single user by ID
 */
export async function getUserById(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;

        const [user] = await db
            .select({
                id: adminUsers.id,
                email: adminUsers.email,
                name: adminUsers.name,
                role: adminUsers.role,
                status: adminUsers.status,
                permissions: adminUsers.permissions,
                isEmailVerified: adminUsers.isEmailVerified,
                lastLogin: adminUsers.lastLogin,
                createdAt: adminUsers.createdAt,
                updatedAt: adminUsers.updatedAt,
            })
            .from(adminUsers)
            .where(eq(adminUsers.id, id))
            .limit(1);

        if (!user) {
            res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
            });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch user',
        });
    }
}

/**
 * PUT /admin/users/:id
 * Update user (status, permissions, role)
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const updates = req.body;

        // Cannot modify own account status
        if (req.user?.userId === id && updates.status) {
            res.status(400).json({
                error: 'Bad Request',
                message: 'Cannot modify your own account status',
            });
            return;
        }

        // Check if user exists
        const [existingUser] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.id, id))
            .limit(1);

        if (!existingUser) {
            res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
            });
            return;
        }

        // If setting role to super_admin, grant all permissions
        let finalPermissions = updates.permissions;
        if (updates.role === 'super_admin') {
            finalPermissions = SUPER_ADMIN_PERMISSIONS;
        }

        // Update user
        const [updatedUser] = await db
            .update(adminUsers)
            .set({
                ...updates,
                permissions: finalPermissions || existingUser.permissions,
                updatedAt: new Date(),
            })
            .where(eq(adminUsers.id, id))
            .returning({
                id: adminUsers.id,
                email: adminUsers.email,
                name: adminUsers.name,
                role: adminUsers.role,
                status: adminUsers.status,
                permissions: adminUsers.permissions,
                isEmailVerified: adminUsers.isEmailVerified,
            });

        res.json(updatedUser);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update user',
        });
    }
}

/**
 * DELETE /admin/users/:id
 * Delete user
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;

        // Cannot delete own account
        if (req.user?.userId === id) {
            res.status(400).json({
                error: 'Bad Request',
                message: 'Cannot delete your own account',
            });
            return;
        }

        // Check if user exists
        const [existingUser] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.id, id))
            .limit(1);

        if (!existingUser) {
            res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
            });
            return;
        }

        await db.delete(adminUsers).where(eq(adminUsers.id, id));

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete user',
        });
    }
}

/**
 * PATCH /admin/users/:id/activate
 * Quick activate user
 */
export async function activateUser(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;

        const [updatedUser] = await db
            .update(adminUsers)
            .set({
                status: 'active',
                updatedAt: new Date(),
            })
            .where(eq(adminUsers.id, id))
            .returning({
                id: adminUsers.id,
                email: adminUsers.email,
                name: adminUsers.name,
                status: adminUsers.status,
            });

        if (!updatedUser) {
            res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
            });
            return;
        }

        res.json({ message: 'User activated successfully', user: updatedUser });
    } catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to activate user',
        });
    }
}

/**
 * PATCH /admin/users/:id/suspend
 * Quick suspend user
 */
export async function suspendUser(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;

        // Cannot suspend own account
        if (req.user?.userId === id) {
            res.status(400).json({
                error: 'Bad Request',
                message: 'Cannot suspend your own account',
            });
            return;
        }

        const [updatedUser] = await db
            .update(adminUsers)
            .set({
                status: 'suspended',
                updatedAt: new Date(),
            })
            .where(eq(adminUsers.id, id))
            .returning({
                id: adminUsers.id,
                email: adminUsers.email,
                name: adminUsers.name,
                status: adminUsers.status,
            });

        if (!updatedUser) {
            res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
            });
            return;
        }

        res.json({ message: 'User suspended successfully', user: updatedUser });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to suspend user',
        });
    }
}
