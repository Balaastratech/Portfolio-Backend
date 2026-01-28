import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { contactSubmissions } from '../../db/schema.js';
import { eq, desc, asc, inArray } from 'drizzle-orm';
import { z } from 'zod';

export const statusSchema = z.object({
    status: z.enum(['new', 'read', 'archived']),
});

export async function getSubmissions(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db
            .select()
            .from(contactSubmissions)
            .orderBy(desc(contactSubmissions.createdAt));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function updateSubmissionStatus(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { status } = req.body;
        const [updated] = await db
            .update(contactSubmissions)
            .set({
                status,
                isRead: status === 'read' || status === 'archived',
                isArchived: status === 'archived'
            })
            .where(eq(contactSubmissions.id, id))
            .returning();

        if (!updated) res.status(404).json({ error: 'Submission not found' });
        else res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function deleteSubmission(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [deleted] = await db
            .delete(contactSubmissions)
            .where(eq(contactSubmissions.id, id))
            .returning();

        if (!deleted) res.status(404).json({ error: 'Submission not found' });
        else res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
