import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { siteConfiguration, formOptions, projects, services, contactSubmissions } from '../../db/schema.js';
import { eq, asc, inArray, count } from 'drizzle-orm';
import { z } from 'zod';

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
    try {
        const [projectCount] = await db.select({ count: count() }).from(projects);
        const [serviceCount] = await db.select({ count: count() }).from(services);
        const [unreadCount] = await db.select({ count: count() }).from(contactSubmissions).where(eq(contactSubmissions.status, 'new'));

        res.json({
            projects: projectCount.count,
            services: serviceCount.count,
            unreadMessages: unreadCount.count,
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


// ============================================================================
// Config
// ============================================================================

export const configSchema = z.object({
    items: z.array(z.object({
        key: z.string(),
        value: z.any(),
    })),
});

export async function getConfig(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db.select().from(siteConfiguration);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function updateConfig(req: Request, res: Response): Promise<void> {
    try {
        const { items } = req.body;
        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx
                    .insert(siteConfiguration)
                    .values({ key: item.key, value: item.value })
                    .onConflictDoUpdate({
                        target: siteConfiguration.key,
                        set: { value: item.value, updatedAt: new Date() },
                    });
            }
        });
        res.json({ message: 'Config updated' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ============================================================================
// Form Options
// ============================================================================

export const formOptionSchema = z.object({
    optionType: z.string(),
    optionValue: z.string(),
});

export async function getFormOptions(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db.select().from(formOptions).orderBy(asc(formOptions.displayOrder));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function createFormOption(req: Request, res: Response): Promise<void> {
    try {
        const { optionType, optionValue } = req.body;

        // Get max order for this type
        const existing = await db
            .select({ displayOrder: formOptions.displayOrder })
            .from(formOptions)
            .where(eq(formOptions.optionType, optionType))
            .orderBy(asc(formOptions.displayOrder));

        const nextOrder = (existing.length > 0 ? existing[existing.length - 1].displayOrder : 0) + 1;

        const [newItem] = await db.insert(formOptions).values({
            optionType,
            optionValue,
            displayOrder: nextOrder,
        }).returning();

        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function deleteFormOption(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [deleted] = await db.delete(formOptions).where(eq(formOptions.id, id)).returning();
        if (!deleted) res.status(404).json({ error: 'Option not found' });
        else res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
