import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { clientFitItems } from '../../db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

export const clientFitSchema = z.object({
    type: z.enum(['compatible', 'incompatible']),
    text: z.string().min(1),
    isPublished: z.boolean().default(true),
});

export const reorderSchema = z.object({
    items: z.array(z.object({
        id: z.string(),
        order: z.number().int(),
    })),
});

// ============================================================================
// Controller Methods
// ============================================================================

export async function getClientFitItems(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db
            .select()
            .from(clientFitItems)
            .orderBy(asc(clientFitItems.displayOrder));
        res.json(data);
    } catch (error) {
        console.error('Error fetching client fit items:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getClientFitItemById(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [item] = await db.select().from(clientFitItems).where(eq(clientFitItems.id, id));
        if (!item) res.status(404).json({ error: 'Item not found' });
        else res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function createClientFitItem(req: Request, res: Response): Promise<void> {
    try {
        const { type, text, isPublished } = req.body;

        const existing = await db
            .select({ displayOrder: clientFitItems.displayOrder })
            .from(clientFitItems)
            .orderBy(desc(clientFitItems.displayOrder))
            .limit(1);

        const nextOrder = (existing[0]?.displayOrder || 0) + 1;

        const [newItem] = await db.insert(clientFitItems).values({
            type,
            text,
            isPublished: isPublished ?? true,
            displayOrder: nextOrder,
        }).returning();

        res.status(201).json(newItem);
    } catch (error) {
        console.error('Error creating client fit item:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function updateClientFitItem(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { type, text, isPublished } = req.body;

        const [updated] = await db
            .update(clientFitItems)
            .set({
                type,
                text,
                isPublished,
                updatedAt: new Date(),
            })
            .where(eq(clientFitItems.id, id))
            .returning();

        if (!updated) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating client fit item:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function deleteClientFitItem(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [deleted] = await db
            .delete(clientFitItems)
            .where(eq(clientFitItems.id, id))
            .returning();

        if (!deleted) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }

        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting client fit item:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function reorderClientFitItems(req: Request, res: Response): Promise<void> {
    try {
        const { items } = req.body;

        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx
                    .update(clientFitItems)
                    .set({ displayOrder: item.order })
                    .where(eq(clientFitItems.id, item.id));
            }
        });

        res.json({ message: 'Items reordered successfully' });
    } catch (error) {
        console.error('Error reordering client fit items:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
