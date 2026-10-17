import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { apiRateLimiter, emailRateLimiter } from '../middleware/rateLimit.js';
import {
    getProjects,
    getProjectBySlug,
    getServices,
    getTechStack,
    getTrustSignals,
    getConfig,
    getFormOptions,
    getClientFit,
    getProcess,
    getAbout,
    getCaseStudies,
    submitContactForm,
} from '../controllers/public.controller.js';
import { getPublicPages } from '../controllers/admin/pages.controller.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const contactFormSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email is required'),
    projectType: z.string().min(1, 'Project type is required'),
    budget: z.string().optional(), // v2 removed the budget gate (WEBSITE-BRIEF §6)
    message: z.string().min(10, 'Message must be at least 10 characters'),
    phone: z.string().optional(),
    timeline: z.string().optional(),
});

// ============================================================================
// Routes
//All public routes use general API rate limiting (100 req/min)
// ============================================================================

router.get('/projects', apiRateLimiter, getProjects);
router.get('/projects/:slug', apiRateLimiter, getProjectBySlug);
router.get('/services', apiRateLimiter, getServices);
router.get('/tech-stack', apiRateLimiter, getTechStack);
router.get('/trust-signals', apiRateLimiter, getTrustSignals);
router.get('/config', apiRateLimiter, getConfig);
router.get('/pages', apiRateLimiter, getPublicPages);
router.get('/form-options', apiRateLimiter, getFormOptions);
router.get('/client-fit', apiRateLimiter, getClientFit);
router.get('/process', apiRateLimiter, getProcess);
router.get('/about', apiRateLimiter, getAbout);
router.get('/case-studies', apiRateLimiter, getCaseStudies);

// Visitor's country from Vercel's edge header, so the site shows one price (₹ / £ / $). Never cached: it is per visitor.
router.get('/geo', (req, res) => {
    const c = String(req.headers['x-vercel-ip-country'] ?? '').toUpperCase();
    res.set('Cache-Control', 'no-store, private').json({ country: /^[A-Z]{2}$/.test(c) ? c : null });
});

// Contact form has stricter validation
router.post(
    '/contact',
    emailRateLimiter,
    validate(contactFormSchema),
    submitContactForm
);

export default router;
