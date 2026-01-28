import { Resend } from 'resend';
import { env } from '../config/env.js';

// Initialize Resend client
const resend = new Resend(env.RESEND_API_KEY);

const FROM_EMAIL = env.FROM_EMAIL || 'noreply@balaastra.tech';

/**
 * Send email verification code to admin user
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your BalaAstraTech Admin account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">Email Verification</h2>
          <p>Hello ${name},</p>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">
              ${code}
            </span>
          </div>
          <p>This code expires in <strong>15 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            BalaAstraTech Admin Panel
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send verification email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email service error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send password reset link to admin user
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${env.ADMIN_PANEL_URL}/reset-password?token=${resetToken}`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your BalaAstraTech Admin password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Click the button below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #6366f1; color: white; padding: 14px 28px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #6366f1;">
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
          <p>This link expires in <strong>1 hour</strong>.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            BalaAstraTech Admin Panel
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email service error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to BalaAstraTech Admin Panel',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">Welcome aboard! 🎉</h2>
          <p>Hello ${name},</p>
          <p>Your email has been verified and your admin account is now active.</p>
          <p>You can now log in to the admin panel to manage your portfolio content.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${env.ADMIN_PANEL_URL}" 
               style="background: #6366f1; color: white; padding: 14px 28px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              Go to Admin Panel
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            BalaAstraTech Admin Panel
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email service error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send notification to admin about new user registration
 */
export async function sendAdminNotification(
  adminEmail: string,
  newUserName: string,
  newUserEmail: string,
  verificationCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `New User Registration: ${newUserName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">New User Registration 🆕</h2>
          <p>A new user has registered for the Admin Panel:</p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Name:</strong> ${newUserName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${newUserEmail}</p>
          </div>
          <p>Their verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">
              ${verificationCode}
            </span>
          </div>
          <p>Share this code with the user so they can verify their email.</p>
          <p>After they verify, you can activate their account from the <strong>Users</strong> section in the Admin Panel.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            BalaAstraTech Admin Panel
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send admin notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email service error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
