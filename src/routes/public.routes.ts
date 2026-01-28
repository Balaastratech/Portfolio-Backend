import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { apiRateLimiter } from '../middleware/rateLimit.js';
import {
    getProjects,
    getServices,
    getTechStack,
    getTrustSignals,
    getConfig,
    getFormOptions,
    getClientFit,
    getProcess,
    getAbout,
    submitContactForm,
} from '../controllers/public.controller.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const contactFormSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email is required'),
    projectType: z.string().min(1, 'Project type is required'),
    budget: z.string().min(1, 'Budget is required'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
    phone: z.string().optional(),
    timeline: z.string().optional(),
});

// ============================================================================
// Routes
//All public routes use general API rate limiting (100 req/min)
// ============================================================================

router.get('/projects', apiRateLimiter, getProjects);
router.get('/services', apiRateLimiter, getServices);
router.get('/tech-stack', apiRateLimiter, getTechStack);
router.get('/trust-signals', apiRateLimiter, getTrustSignals);
router.get('/config', apiRateLimiter, getConfig);
router.get('/form-options', apiRateLimiter, getFormOptions);
router.get('/client-fit', apiRateLimiter, getClientFit);
router.get('/process', apiRateLimiter, getProcess);
router.get('/about', apiRateLimiter, getAbout);

// Contact form has stricter validation
router.post(
    '/contact',
    apiRateLimiter,
    validate(contactFormSchema),
    submitContactForm
);

export default router;
