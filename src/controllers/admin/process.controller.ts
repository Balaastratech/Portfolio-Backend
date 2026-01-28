import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { processSteps } from '../../db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

export const processStepSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    iconName: z.string().min(1),
    duration: z.string().min(1),
    isPublished: z.boolean().default(true),
});

// Reorder schema is same generic structure
export const reorderSchema = z.object({
    items: z.array(z.object({
        id: z.string(),
        order: z.number().int(),
    })),
});

export async function getProcessSteps(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db
            .select()
            .from(processSteps)
            .orderBy(asc(processSteps.displayOrder));
        res.json(data);
    } catch (error) {
        console.error('Error fetching process steps:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getProcessStepById(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [item] = await db.select().from(processSteps).where(eq(processSteps.id, id));
        if (!item) res.status(404).json({ error: 'Step not found' });
        else res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function createProcessStep(req: Request, res: Response): Promise<void> {
    try {
        const { title, description, iconName, duration, isPublished } = req.body;

        const existing = await db
            .select({ displayOrder: processSteps.displayOrder })
            .from(processSteps)
            .orderBy(desc(processSteps.displayOrder))
            .limit(1);

        const nextOrder = (existing[0]?.displayOrder || 0) + 1;

        const [newItem] = await db.insert(processSteps).values({
            title,
            description,
            iconName,
            duration,
            isPublished: isPublished ?? true,
            displayOrder: nextOrder,
        }).returning();

        res.status(201).json(newItem);
    } catch (error) {
        console.error('Error creating process step:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function updateProcessStep(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { title, description, iconName, duration, isPublished } = req.body;

        const [updated] = await db
            .update(processSteps)
            .set({
                title,
                description,
                iconName,
                duration,
                isPublished,
                updatedAt: new Date(),
            })
            .where(eq(processSteps.id, id))
            .returning();

        if (!updated) {
            res.status(404).json({ error: 'Step not found' });
            return;
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating process step:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function deleteProcessStep(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [deleted] = await db
            .delete(processSteps)
            .where(eq(processSteps.id, id))
            .returning();

        if (!deleted) {
            res.status(404).json({ error: 'Step not found' });
            return;
        }

        res.json({ message: 'Step deleted successfully' });
    } catch (error) {
        console.error('Error deleting process step:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function reorderProcessSteps(req: Request, res: Response): Promise<void> {
    try {
        const { items } = req.body;

        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx
                    .update(processSteps)
                    .set({ displayOrder: item.order })
                    .where(eq(processSteps.id, item.id));
            }
        });

        res.json({ message: 'Steps reordered successfully' });
    } catch (error) {
        console.error('Error reordering process steps:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
