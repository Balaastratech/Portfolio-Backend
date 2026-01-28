import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// Skip rate limiting in development
const skipRateLimiting = env.isDevelopment;

/**
 * Rate limiter for authentication endpoints
 * 50 attempts per 15 minutes (more lenient for development)
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: skipRateLimiting ? 1000 : 50, // Very high in dev, 50 in production
    message: {
        error: 'Too Many Requests',
        message: 'Too many attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => skipRateLimiting, // Skip rate limiting in development
});

/**
 * Rate limiter for email-sending endpoints
 * 3 attempts per hour (to prevent email spam)
 */
export const emailRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per window
    message: {
        error: 'Too Many Requests',
        message: 'Too many email requests. Please try again in an hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for general admin API endpoints
 * 100 requests per minute
 */
export const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per window
    message: {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please slow down.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Default to IP based rate limiting to avoid IPv6 errors
});

/**
 * Strict rate limiter for password change/reset
 * 5 attempts per 15 minutes
 */
export const passwordRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: {
        error: 'Too Many Requests',
        message: 'Too many password attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
