import { Router } from 'express';
import { authMiddleware, requireRole, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { apiRateLimiter } from '../middleware/rateLimit.js';

// Controllers
import * as Projects from '../controllers/admin/projects.controller.js';
import * as Content from '../controllers/admin/content.controller.js';
import * as Config from '../controllers/admin/config.controller.js';
import * as Inbox from '../controllers/admin/inbox.controller.js';
import * as ClientFit from '../controllers/admin/client-fit.controller.js';
import * as Process from '../controllers/admin/process.controller.js';
import * as About from '../controllers/admin/about.controller.js';
import * as Users from '../controllers/admin/users.controller.js';

const router = Router();

// Apply Auth & Rate Limit to ALL admin routes
router.use(authMiddleware);
router.use(apiRateLimiter);

// ============================================================================
// Projects
// ============================================================================
router.get('/projects', requirePermission('projects'), Projects.getProjects);
router.get('/projects/:id', requirePermission('projects'), Projects.getProjectById);
router.post('/projects', requirePermission('projects'), validate(Projects.projectSchema), Projects.createProject);
router.put('/projects/:id', requirePermission('projects'), validate(Projects.projectSchema), Projects.updateProject);
router.delete('/projects/:id', requirePermission('projects'), Projects.deleteProject);
router.patch('/projects/reorder', requirePermission('projects'), validate(Projects.reorderSchema), Projects.reorderProjects);

// ============================================================================
// Services
// ============================================================================
router.get('/services', requirePermission('services'), Content.getServices);
router.get('/services/:id', requirePermission('services'), Content.getServiceById);
router.post('/services', requirePermission('services'), validate(Content.serviceSchema), Content.createService);
router.put('/services/:id', requirePermission('services'), validate(Content.serviceSchema), Content.updateService);
router.delete('/services/:id', requirePermission('services'), Content.deleteService);
router.patch('/services/reorder', requirePermission('services'), validate(Projects.reorderSchema), Content.reorderServices);

// ============================================================================
// Additional Capabilities
// ============================================================================
router.get('/capabilities', requirePermission('capabilities'), Content.getCapabilities);
router.get('/capabilities/:id', requirePermission('capabilities'), Content.getCapabilityById);
router.post('/capabilities', requirePermission('capabilities'), validate(Content.capabilitySchema), Content.createCapability);
router.put('/capabilities/:id', requirePermission('capabilities'), validate(Content.capabilitySchema), Content.updateCapability);
router.delete('/capabilities/:id', requirePermission('capabilities'), Content.deleteCapability);
router.patch('/capabilities/reorder', requirePermission('capabilities'), validate(Projects.reorderSchema), Content.reorderCapabilities);

// ============================================================================
// Tech Stack
// ============================================================================
router.get('/tech-stack', requirePermission('techStack'), Content.getTechStack);
router.get('/tech-stack/:id', requirePermission('techStack'), Content.getTechStackById);
router.post('/tech-stack', requirePermission('techStack'), validate(Content.techStackSchema), Content.createTechStack);
router.put('/tech-stack/:id', requirePermission('techStack'), validate(Content.techStackSchema), Content.updateTechStack);
router.delete('/tech-stack/:id', requirePermission('techStack'), Content.deleteTechStack);
router.patch('/tech-stack/reorder', requirePermission('techStack'), validate(Projects.reorderSchema), Content.reorderTechStack);

// ============================================================================
// Trust Signals
// ============================================================================
router.get('/trust-signals', requirePermission('trustSignals'), Content.getTrustSignals);
router.get('/trust-signals/:id', requirePermission('trustSignals'), Content.getTrustSignalById);
router.post('/trust-signals', requirePermission('trustSignals'), validate(Content.trustSignalSchema), Content.createTrustSignal);
router.put('/trust-signals/:id', requirePermission('trustSignals'), validate(Content.trustSignalSchema), Content.updateTrustSignal);
router.delete('/trust-signals/:id', requirePermission('trustSignals'), Content.deleteTrustSignal);
router.patch('/trust-signals/reorder', requirePermission('trustSignals'), validate(Projects.reorderSchema), Content.reorderTrustSignals);

// ============================================================================
// Client Fit (Protocol)
// ============================================================================
router.get('/client-fit', requirePermission('clientFit'), ClientFit.getClientFitItems);
router.get('/client-fit/:id', requirePermission('clientFit'), ClientFit.getClientFitItemById);
router.post('/client-fit', requirePermission('clientFit'), validate(ClientFit.clientFitSchema), ClientFit.createClientFitItem);
router.put('/client-fit/:id', requirePermission('clientFit'), validate(ClientFit.clientFitSchema), ClientFit.updateClientFitItem);
router.delete('/client-fit/:id', requirePermission('clientFit'), ClientFit.deleteClientFitItem);
router.patch('/client-fit/reorder', requirePermission('clientFit'), validate(ClientFit.reorderSchema), ClientFit.reorderClientFitItems);

// ============================================================================
// Process (Execution)
// ============================================================================
router.get('/process', requirePermission('process'), Process.getProcessSteps);
router.get('/process/:id', requirePermission('process'), Process.getProcessStepById);
router.post('/process', requirePermission('process'), validate(Process.processStepSchema), Process.createProcessStep);
router.put('/process/:id', requirePermission('process'), validate(Process.processStepSchema), Process.updateProcessStep);
router.delete('/process/:id', requirePermission('process'), Process.deleteProcessStep);
router.patch('/process/reorder', requirePermission('process'), validate(Process.reorderSchema), Process.reorderProcessSteps);

// ============================================================================
// About (Identity)
// ============================================================================
router.get('/about', requirePermission('about'), About.getAboutItems);
router.get('/about/:id', requirePermission('about'), About.getAboutItemById);
router.post('/about', requirePermission('about'), validate(About.aboutItemSchema), About.createAboutItem);
router.put('/about/:id', requirePermission('about'), validate(About.aboutItemSchema), About.updateAboutItem);
router.delete('/about/:id', requirePermission('about'), About.deleteAboutItem);
router.patch('/about/reorder', requirePermission('about'), validate(About.reorderSchema), About.reorderAboutItems);

// ============================================================================
// Site Configuration & Form Options
// ============================================================================
router.get('/stats', requirePermission('dashboard'), Config.getDashboardStats);
router.get('/config', requirePermission('siteConfig'), Config.getConfig);
router.put('/config', requirePermission('siteConfig'), validate(Config.configSchema), Config.updateConfig);

router.get('/form-options', requirePermission('formOptions'), Config.getFormOptions);
router.post('/form-options', requirePermission('formOptions'), validate(Config.formOptionSchema), Config.createFormOption);
router.delete('/form-options/:id', requirePermission('formOptions'), Config.deleteFormOption);

// ============================================================================
// Inbox (Super Admin Only)
// ============================================================================
router.get('/inbox', requirePermission('inbox'), Inbox.getSubmissions);
router.patch('/inbox/:id', requirePermission('inbox'), validate(Inbox.statusSchema), Inbox.updateSubmissionStatus);
router.delete('/inbox/:id', requirePermission('inbox'), Inbox.deleteSubmission);

// ============================================================================
// User Management (Super Admin Only)
// ============================================================================
router.get('/users', requireRole('super_admin'), Users.getUsers);
router.get('/users/:id', requireRole('super_admin'), Users.getUserById);
router.put('/users/:id', requireRole('super_admin'), validate(Users.updateUserSchema), Users.updateUser);
router.delete('/users/:id', requireRole('super_admin'), Users.deleteUser);
router.patch('/users/:id/activate', requireRole('super_admin'), Users.activateUser);
router.patch('/users/:id/suspend', requireRole('super_admin'), Users.suspendUser);

export default router;

