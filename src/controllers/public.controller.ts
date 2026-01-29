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
} from '../db/schema.js';
import { desc, eq, asc, and } from 'drizzle-orm';
import { sendContactFormEmail } from '../services/email.js';

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

        res.json(data);
    } catch (error) {
        console.error('Error fetching projects:', error);
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
        const { name, email, projectType, budget, message, phone, timeline } = req.body;

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

        // Send email notification asynchronously
        // We don't wait for it to complete to return response to user
        sendContactFormEmail({
            name,
            email,
            phone,
            projectType,
            budget,
            timeline,
            message
        }).catch(err => console.error('Failed to send contact email notification:', err));

        res.status(201).json({
            message: 'Message received successfully. We will get back to you shortly.',
            id: submission.id
        });
    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
