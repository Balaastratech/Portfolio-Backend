import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { aboutItems } from '../../db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

export const aboutItemSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    isPublished: z.boolean().default(true),
});

export const reorderSchema = z.object({
    items: z.array(z.object({
        id: z.string(),
        order: z.number().int(),
    })),
});

export async function getAboutItems(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db
            .select()
            .from(aboutItems)
            .orderBy(asc(aboutItems.displayOrder));
        res.json(data);
    } catch (error) {
        console.error('Error fetching about items:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getAboutItemById(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [item] = await db.select().from(aboutItems).where(eq(aboutItems.id, id));
        if (!item) res.status(404).json({ error: 'Item not found' });
        else res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function createAboutItem(req: Request, res: Response): Promise<void> {
    try {
        const { title, description, isPublished } = req.body;

        const existing = await db
            .select({ displayOrder: aboutItems.displayOrder })
            .from(aboutItems)
            .orderBy(desc(aboutItems.displayOrder))
            .limit(1);

        const nextOrder = (existing[0]?.displayOrder || 0) + 1;

        const [newItem] = await db.insert(aboutItems).values({
            title,
            description,
            isPublished: isPublished ?? true,
            displayOrder: nextOrder,
        }).returning();

        res.status(201).json(newItem);
    } catch (error) {
        console.error('Error creating about item:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function updateAboutItem(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { title, description, isPublished } = req.body;

        const [updated] = await db
            .update(aboutItems)
            .set({
                title,
                description,
                isPublished,
                updatedAt: new Date(),
            })
            .where(eq(aboutItems.id, id))
            .returning();

        if (!updated) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating about item:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function deleteAboutItem(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [deleted] = await db
            .delete(aboutItems)
            .where(eq(aboutItems.id, id))
            .returning();

        if (!deleted) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }

        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting about item:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function reorderAboutItems(req: Request, res: Response): Promise<void> {
    try {
        const { items } = req.body;

        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx
                    .update(aboutItems)
                    .set({ displayOrder: item.order })
                    .where(eq(aboutItems.id, item.id));
            }
        });

        res.json({ message: 'Items reordered successfully' });
    } catch (error) {
        console.error('Error reordering about items:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
