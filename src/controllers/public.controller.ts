import { Request, Response } from 'express';
import { db } from '../config/database.js';
import {
    projects,
    services,
    additionalCapabilities,
    techStackLayers,
    trustSignals,
    siteConfiguration,
    formOptions,
    contactSubmissions,
    clientFitItems,
    processSteps,
    aboutItems,
    caseStudies,
} from '../db/schema.js';
import { desc, eq, asc, and } from 'drizzle-orm';
import { sendContactFormEmail } from '../services/email.js';
import { contactDeliveryStatus } from '../utils/contactDelivery.js';
import { visibleOnly, type SocialLink } from '../db/content.js';

type ProjectRow = typeof projects.$inferSelect;

/** Public shape: hidden price plans and demo videos never leave the server. */
function publicProject(p: ProjectRow): ProjectRow {
    return { ...p, pricePlans: visibleOnly(p.pricePlans), demos: visibleOnly(p.demos) };
}

/**
 * GET /api/public/projects
 * Fetch all published projects ordered by displayOrder
 */
export async function getProjects(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db
            .select()
            .from(projects)
            .where(eq(projects.isPublished, true))
            .orderBy(asc(projects.displayOrder));

        res.json(data.map(publicProject));
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * GET /api/public/projects/:slug
 * One published project by slug (v2 project pages)
 */
export async function getProjectBySlug(req: Request, res: Response): Promise<void> {
    try {
        const [item] = await db
            .select()
            .from(projects)
            .where(and(eq(projects.slug, req.params.slug as string), eq(projects.isPublished, true)))
            .limit(1);
        if (!item) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json(publicProject(item));
    } catch (error) {
        console.error('Error fetching project by slug:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * GET /api/public/services
 * Fetch published services and additional capabilities
 */
export async function getServices(_req: Request, res: Response): Promise<void> {
    try {
        const [servicesData, capabilitiesData] = await Promise.all([
            db
                .select()
                .from(services)
                .where(eq(services.isPublished, true))
                .orderBy(asc(services.displayOrder)),
            db
                .select()
                .from(additionalCapabilities)
                .orderBy(asc(additionalCapabilities.displayOrder)),
        ]);

        res.json({
            services: servicesData,
            additionalCapabilities: capabilitiesData,
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * GET /api/public/tech-stack
 * Fetch tech stack layers ordered by displayOrder
 */
export async function getTechStack(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db
            .select()
            .from(techStackLayers)
            .orderBy(asc(techStackLayers.displayOrder));

        res.json(data);
    } catch (error) {
        console.error('Error fetching tech stack:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * GET /api/public/trust-signals
 * Fetch published trust signals ordered by displayOrder
 */
export async function getTrustSignals(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db
            .select()
            .from(trustSignals)
            .where(eq(trustSignals.isPublished, true))
            .orderBy(asc(trustSignals.displayOrder));

        res.json(data);
    } catch (error) {
        console.error('Error fetching trust signals:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getCaseStudies(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db.select().from(caseStudies)
            .where(and(eq(caseStudies.isPublished, true), eq(caseStudies.consentConfirmed, true)))
            .orderBy(asc(caseStudies.displayOrder));
        res.json(data);
    } catch (error) {
        console.error('Error fetching case studies:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * GET /api/public/client-fit
 * Fetch client fit items ordered by displayOrder
 */
export async function getClientFit(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db
            .select()
            .from(clientFitItems)
            .where(eq(clientFitItems.isPublished, true))
            .orderBy(asc(clientFitItems.displayOrder));
        res.json(data);
    } catch (error) {
        console.error('Error fetching client fit:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * GET /api/public/process
 * Fetch process steps ordered by displayOrder
 */
export async function getProcess(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db
            .select()
            .from(processSteps)
            .where(eq(processSteps.isPublished, true))
            .orderBy(asc(processSteps.displayOrder));
        res.json(data);
    } catch (error) {
        console.error('Error fetching process:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * GET /api/public/about
 * Fetch about items ordered by displayOrder
 */
export async function getAbout(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db
            .select()
            .from(aboutItems)
            .where(eq(aboutItems.isPublished, true))
            .orderBy(asc(aboutItems.displayOrder));
        res.json(data);
    } catch (error) {
        console.error('Error fetching about:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * GET /api/public/config
 * Fetch site configuration converted to object structure
 */
export async function getConfig(_req: Request, res: Response): Promise<void> {
    try {
        const configItems = await db.select().from(siteConfiguration);

        // Transform array to key-value object
        const config = configItems.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {} as Record<string, any>);

        // v2 list: hidden rows stay private; the legacy object form passes through untouched.
        if (Array.isArray(config.social_links)) {
            config.social_links = visibleOnly(config.social_links as SocialLink[]).sort((a, b) => a.order - b.order);
        }

        res.json(config);
    } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * GET /api/public/form-options
 * Fetch form options grouped by type
 */
export async function getFormOptions(_req: Request, res: Response): Promise<void> {
    try {
        const options = await db
            .select()
            .from(formOptions)
            .orderBy(asc(formOptions.displayOrder));

        // Group by type
        const grouped = options.reduce((acc, item) => {
            if (!acc[item.optionType]) {
                acc[item.optionType] = [];
            }
            acc[item.optionType].push(item.optionValue);
            return acc;
        }, {} as Record<string, string[]>);

        res.json({
            systemTypes: grouped['system_type'] || [],
            budgetRanges: grouped['budget_range'] || [],
        });
    } catch (error) {
        console.error('Error fetching form options:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * POST /api/public/contact
 * Handle contact form submission
 */
export async function submitContactForm(req: Request, res: Response): Promise<void> {
    try {
        const { name, email, projectType, message, phone, timeline } = req.body;
        const budget: string = req.body.budget || 'not asked'; // v2 form has no budget field; column stays NOT NULL

        const [submission] = await db.insert(contactSubmissions).values({
            name,
            email,
            projectType,
            budget,
            message,
            phone,
            timeline,
            status: 'new',
            isRead: false,
            isArchived: false,
        }).returning();

        // Send email notification (Must await in Vercel/Serverless to ensure execution)
        let notificationDelivered = false;
        try {
            const delivery = await sendContactFormEmail({
                name,
                email,
                phone,
                projectType,
                budget,
                timeline,
                message
            });
            notificationDelivered = delivery.success;
        } catch (emailError) {
            console.error('Failed to send contact email notification:', emailError);
            // We still return success to the user because the DB save was successful
        }
        // The admin Inbox shows whether the email reached him, per enquiry.
        await db.update(contactSubmissions).set({ emailStatus: notificationDelivered ? 'sent' : 'failed' })
            .where(eq(contactSubmissions.id, submission.id));

        res.status(contactDeliveryStatus(notificationDelivered)).json({
            message: notificationDelivered
                ? 'Message saved and notification delivered.'
                : 'Message saved. Notification delivery is delayed; the admin inbox retains your submission.',
            id: submission.id,
            notificationDelivered,
            manualFollowupRequired: !notificationDelivered,
        });
    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
