import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { adminUsers, DEFAULT_PERMISSIONS } from '../db/schema.js';
import { hashPassword, verifyPassword, generateResetToken, generateVerificationCode, validatePasswordStrength } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendAdminNotification } from '../services/email.js';

/**
 * POST /api/admin/auth/login
 * Login with email and password
 */
export async function login(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body;

        // Find user by email
        const [user] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.email, email.toLowerCase()))
            .limit(1);

        if (!user) {
            res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect',
            });
            return;
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
            res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect',
            });
            return;
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            res.status(403).json({
                error: 'Email not verified',
                message: 'Please verify your email before logging in',
                requiresVerification: true,
            });
            return;
        }

        // Check account status
        if (user.status === 'pending') {
            res.status(403).json({
                error: 'Account pending',
                message: 'Your account is pending admin approval. Please wait for activation.',
                requiresApproval: true,
            });
            return;
        }

        if (user.status === 'suspended') {
            res.status(403).json({
                error: 'Account suspended',
                message: 'Your account has been suspended. Please contact the administrator.',
            });
            return;
        }

        // Update last login
        await db
            .update(adminUsers)
            .set({ lastLogin: new Date(), updatedAt: new Date() })
            .where(eq(adminUsers.id, user.id));

        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: user.permissions,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An error occurred during login',
        });
    }
}

/**
 * POST /api/admin/auth/logout
 * Logout (client-side token removal)
 */
export async function logout(_req: Request, res: Response): Promise<void> {
    // JWT tokens are stateless, so logout is handled client-side
    // This endpoint is here for completeness and potential future token blacklisting
    res.json({
        message: 'Logged out successfully',
    });
}

/**
 * GET /api/admin/auth/verify
 * Verify JWT token and return user info
 */
export async function verifyAuth(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token',
            });
            return;
        }

        // Get fresh user data including permissions
        const [user] = await db
            .select({
                id: adminUsers.id,
                email: adminUsers.email,
                name: adminUsers.name,
                role: adminUsers.role,
                permissions: adminUsers.permissions,
                isEmailVerified: adminUsers.isEmailVerified,
            })
            .from(adminUsers)
            .where(eq(adminUsers.id, req.user.userId))
            .limit(1);

        if (!user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'User not found',
            });
            return;
        }

        res.json({ user });
    } catch (error) {
        console.error('Verify auth error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An error occurred during verification',
        });
    }
}

/**
 * POST /api/admin/auth/change-password
 * Change password (requires current password)
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        // Validate new password strength
        const passwordCheck = validatePasswordStrength(newPassword);
        if (!passwordCheck.valid) {
            res.status(400).json({
                error: 'Validation Error',
                message: passwordCheck.message,
            });
            return;
        }

        // Get user
        const [user] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.id, req.user.userId))
            .limit(1);

        if (!user) {
            res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
            });
            return;
        }

        // Verify current password
        const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
        if (!isValidPassword) {
            res.status(401).json({
                error: 'Invalid password',
                message: 'Current password is incorrect',
            });
            return;
        }

        // Hash new password
        const newPasswordHash = await hashPassword(newPassword);

        // Update password
        await db
            .update(adminUsers)
            .set({
                passwordHash: newPasswordHash,
                updatedAt: new Date()
            })
            .where(eq(adminUsers.id, user.id));

        res.json({
            message: 'Password changed successfully',
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An error occurred while changing password',
        });
    }
}

/**
 * POST /api/admin/auth/verify-email
 * Verify email with 6-digit code
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
    try {
        const { email, code } = req.body;

        // Find user by email
        const [user] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.email, email.toLowerCase()))
            .limit(1);

        if (!user) {
            res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
            });
            return;
        }

        // Check if already verified
        if (user.isEmailVerified) {
            res.status(400).json({
                error: 'Already Verified',
                message: 'Email is already verified',
            });
            return;
        }

        // Check if code matches and is not expired
        if (!user.emailVerifyToken || user.emailVerifyToken !== code) {
            res.status(400).json({
                error: 'Invalid Code',
                message: 'Verification code is invalid',
            });
            return;
        }

        if (!user.emailVerifyExpires || new Date() > user.emailVerifyExpires) {
            res.status(400).json({
                error: 'Expired Code',
                message: 'Verification code has expired. Please request a new one.',
            });
            return;
        }

        // Mark email as verified
        await db
            .update(adminUsers)
            .set({
                isEmailVerified: true,
                emailVerifyToken: null,
                emailVerifyExpires: null,
                updatedAt: new Date(),
            })
            .where(eq(adminUsers.id, user.id));

        // Send welcome email
        await sendWelcomeEmail(user.email, user.name);

        res.json({
            message: 'Email verified successfully',
        });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An error occurred during email verification',
        });
    }
}

/**
 * POST /api/admin/auth/resend-verification
 * Resend verification code
 */
export async function resendVerification(req: Request, res: Response): Promise<void> {
    try {
        const { email } = req.body;

        // Find user by email
        const [user] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.email, email.toLowerCase()))
            .limit(1);

        if (!user) {
            // Don't reveal if email exists
            res.json({
                message: 'If the email exists, a verification code has been sent',
            });
            return;
        }

        // Check if already verified
        if (user.isEmailVerified) {
            res.status(400).json({
                error: 'Already Verified',
                message: 'Email is already verified',
            });
            return;
        }

        // Generate new verification code
        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Update user with new code
        await db
            .update(adminUsers)
            .set({
                emailVerifyToken: verificationCode,
                emailVerifyExpires: expiresAt,
                updatedAt: new Date(),
            })
            .where(eq(adminUsers.id, user.id));

        // Send verification email
        const emailResult = await sendVerificationEmail(user.email, user.name, verificationCode);

        if (!emailResult.success) {
            console.error('Failed to send verification email:', emailResult.error);
        }

        res.json({
            message: 'If the email exists, a verification code has been sent',
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An error occurred while sending verification email',
        });
    }
}

/**
 * POST /api/admin/auth/forgot-password
 * Request password reset email
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
    try {
        const { email } = req.body;

        // Find user by email
        const [user] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.email, email.toLowerCase()))
            .limit(1);

        // Always return success to prevent email enumeration
        if (!user) {
            res.json({
                message: 'If the email exists, a password reset link has been sent',
            });
            return;
        }

        // Generate reset token
        const resetToken = generateResetToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Update user with reset token
        await db
            .update(adminUsers)
            .set({
                passwordResetToken: resetToken,
                passwordResetExpires: expiresAt,
                updatedAt: new Date(),
            })
            .where(eq(adminUsers.id, user.id));

        // Send password reset email
        const emailResult = await sendPasswordResetEmail(user.email, user.name, resetToken);

        if (!emailResult.success) {
            console.error('Failed to send password reset email:', emailResult.error);
        }

        res.json({
            message: 'If the email exists, a password reset link has been sent',
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An error occurred while processing your request',
        });
    }
}

/**
 * POST /api/admin/auth/reset-password
 * Reset password with token
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
    try {
        const { token, password } = req.body;

        // Validate new password strength
        const passwordCheck = validatePasswordStrength(password);
        if (!passwordCheck.valid) {
            res.status(400).json({
                error: 'Validation Error',
                message: passwordCheck.message,
            });
            return;
        }

        // Find user by reset token
        const [user] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.passwordResetToken, token))
            .limit(1);

        if (!user) {
            res.status(400).json({
                error: 'Invalid Token',
                message: 'Password reset token is invalid or has already been used',
            });
            return;
        }

        // Check if token is expired
        if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
            res.status(400).json({
                error: 'Expired Token',
                message: 'Password reset token has expired. Please request a new one.',
            });
            return;
        }

        // Hash new password
        const newPasswordHash = await hashPassword(password);

        // Update password and clear reset token
        await db
            .update(adminUsers)
            .set({
                passwordHash: newPasswordHash,
                passwordResetToken: null,
                passwordResetExpires: null,
                updatedAt: new Date(),
            })
            .where(eq(adminUsers.id, user.id));

        res.json({
            message: 'Password reset successfully. You can now log in with your new password.',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An error occurred while resetting your password',
        });
    }
}

/**
 * POST /api/admin/auth/register
 * Self-registration for new users
 */
export async function register(req: Request, res: Response): Promise<void> {
    try {
        const { email, password, name } = req.body;

        // Validate password strength
        const passwordCheck = validatePasswordStrength(password);
        if (!passwordCheck.valid) {
            res.status(400).json({
                error: 'Validation Error',
                message: passwordCheck.message,
            });
            return;
        }

        // Check if email already exists
        const [existingUser] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.email, email.toLowerCase()))
            .limit(1);

        if (existingUser) {
            res.status(409).json({
                error: 'Email Exists',
                message: 'An account with this email already exists',
            });
            return;
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Generate verification code
        const verificationCode = generateVerificationCode();
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user with pending status
        const [newUser] = await db
            .insert(adminUsers)
            .values({
                email: email.toLowerCase(),
                passwordHash,
                name,
                role: 'admin',
                status: 'pending',
                permissions: DEFAULT_PERMISSIONS,
                isEmailVerified: false,
                emailVerifyToken: verificationCode,
                emailVerifyExpires: verifyExpires,
            })
            .returning({
                id: adminUsers.id,
                email: adminUsers.email,
                name: adminUsers.name,
            });

        // Import env to get ADMIN_EMAIL
        const { env } = await import('../config/env.js');

        // Send notification to admin with verification code
        const adminEmail = env.ADMIN_EMAIL || 'balaastratech@gmail.com';
        const adminNotifyResult = await sendAdminNotification(
            adminEmail,
            name,
            email.toLowerCase(),
            verificationCode
        );

        if (!adminNotifyResult.success) {
            console.error('Failed to send admin notification:', adminNotifyResult.error);
        }

        // Also send verification email directly to the user
        const userEmailResult = await sendVerificationEmail(
            email.toLowerCase(),
            name,
            verificationCode
        );

        if (!userEmailResult.success) {
            console.error('Failed to send user verification email:', userEmailResult.error);
        }

        res.status(201).json({
            message: 'Registration successful! Check your email for the verification code.',
            email: email.toLowerCase(),
            user: newUser,
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An error occurred during registration',
        });
    }
}

/**
 * POST /api/admin/auth/check-status
 * Check account status (for polling after email verification)
 */
export async function checkStatus(req: Request, res: Response): Promise<void> {
    try {
        const { email } = req.body;

        // Find user by email
        const [user] = await db
            .select({
                status: adminUsers.status,
                isEmailVerified: adminUsers.isEmailVerified,
            })
            .from(adminUsers)
            .where(eq(adminUsers.email, email.toLowerCase()))
            .limit(1);

        if (!user) {
            res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
            });
            return;
        }

        res.json({
            status: user.status,
            isEmailVerified: user.isEmailVerified,
        });
    } catch (error) {
        console.error('Check status error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'An error occurred while checking status',
        });
    }
}
