import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Global rate limiter: 300 requests per 15 minutes
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.',
});

// Auth rate limiter: 5 requests per 15 minutes (strict)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    // Only credential attempts count. The admin calls GET /verify on every page load, so counting it
    // logged the admin out after 5 page loads in 15 minutes.
    skip: (req) => req.method === 'GET' || req.path === '/logout',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: 'Too many login attempts, please try again later.',
});

// Configure Helmet for secure headers
export const securityHeaders = helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
});
