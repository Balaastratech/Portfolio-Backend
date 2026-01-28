import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimiter, emailRateLimiter, passwordRateLimiter } from '../middleware/rateLimit.js';
import {
    login,
    logout,
    verifyAuth,
    changePassword,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    register,
    checkStatus,
} from '../controllers/auth.controller.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const loginSchema = z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required').max(100),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const verifyEmailSchema = z.object({
    email: z.string().email('Valid email is required'),
    code: z.string().length(6, 'Code must be 6 digits'),
});

const emailOnlySchema = z.object({
    email: z.string().email('Valid email is required'),
});

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/admin/auth/register
 * Self-registration for new users
 */
router.post('/register', authRateLimiter, validate(registerSchema), register);

/**
 * POST /api/admin/auth/login
 * Login with email and password
 */
router.post('/login', authRateLimiter, validate(loginSchema), login);

/**
 * POST /api/admin/auth/logout
 * Logout (requires auth)
 */
router.post('/logout', authMiddleware, logout);

/**
 * GET /api/admin/auth/verify
 * Verify token and return user info (requires auth)
 */
router.get('/verify', authMiddleware, verifyAuth);

/**
 * POST /api/admin/auth/change-password
 * Change password (requires auth)
 */
router.post(
    '/change-password',
    authMiddleware,
    passwordRateLimiter,
    validate(changePasswordSchema),
    changePassword
);

/**
 * POST /api/admin/auth/verify-email
 * Verify email with 6-digit code
 */
router.post(
    '/verify-email',
    authRateLimiter,
    validate(verifyEmailSchema),
    verifyEmail
);

/**
 * POST /api/admin/auth/resend-verification
 * Resend verification email
 */
router.post(
    '/resend-verification',
    emailRateLimiter,
    validate(emailOnlySchema),
    resendVerification
);

/**
 * POST /api/admin/auth/forgot-password
 * Request password reset email
 */
router.post(
    '/forgot-password',
    emailRateLimiter,
    validate(emailOnlySchema),
    forgotPassword
);

/**
 * POST /api/admin/auth/reset-password
 * Reset password with token
 */
router.post(
    '/reset-password',
    passwordRateLimiter,
    validate(resetPasswordSchema),
    resetPassword
);

/**
 * POST /api/admin/auth/check-status
 * Check account status (for polling)
 */
router.post(
    '/check-status',
    authRateLimiter,
    validate(emailOnlySchema),
    checkStatus
);

export default router;
