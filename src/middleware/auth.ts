import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, DecodedToken } from '../utils/jwt.js';
import { db } from '../config/database.js';
import { adminUsers } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: DecodedToken;
        }
    }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header and attaches user to request
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);

        if (!token) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided'
            });
            return;
        }

        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof Error && error.name === 'TokenExpiredError') {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Token has expired'
            });
            return;
        }

        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid token'
        });
    }
}

/**
 * Role-based authorization middleware
 * Use after authMiddleware to check if user has required role
 */
export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions'
            });
            return;
        }

        next();
    };
}

/**
 * Permission-based authorization middleware
 * Checks if user has specific permission in database
 */
export function requirePermission(permission: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
                return;
            }

            // Super admin bypass
            if (req.user.role === 'super_admin') {
                next();
                return;
            }

            // Fetch user from DB to get latest permissions
            const [user] = await db
                .select({ permissions: adminUsers.permissions })
                .from(adminUsers)
                .where(eq(adminUsers.id, req.user.userId))
                .limit(1);

            if (!user || !user.permissions) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: 'No permissions found for user'
                });
                return;
            }

            const permissions = user.permissions as unknown as Record<string, boolean>;

            if (permissions[permission] !== true) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: `Missing required permission: ${permission}`
                });
                return;
            }

            next();
        } catch (error) {
            console.error('Permission middleware error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to verify permissions'
            });
        }
    };
}

/**
 * Optional authentication middleware
 * Attaches user to request if valid token is present, but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);

        if (token) {
            const decoded = verifyToken(token);
            req.user = decoded;
        }

        next();
    } catch {
        // Token invalid or expired, continue without user
        next();
    }
}

