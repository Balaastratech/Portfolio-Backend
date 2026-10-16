import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { pages } from '../../db/schema.js';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { pageSchema } from '../../db/content.js';

// Website pages: each page is an ordered list of sections (Content → Pages in the admin).
// A page save sends the whole page, so add / edit / hide / delete / reorder of sections is one PUT.
export { pageSchema };

async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    const where = exceptId ? and(eq(pages.slug, slug), ne(pages.id, exceptId)) : eq(pages.slug, slug);
    const [row] = await db.select({ id: pages.id }).from(pages).where(where).limit(1);
    return !!row;
}

const conflict = (res: Response, slug: string) =>
    res.status(409).json({ error: 'Conflict', message: `Another page already uses the address /${slug}` });

export async function getPages(_req: Request, res: Response): Promise<void> {
    try {
        res.json(await db.select().from(pages).orderBy(asc(pages.displayOrder), asc(pages.createdAt)));
    } catch (error) {
        console.error('Error fetching pages:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getPageById(req: Request, res: Response): Promise<void> {
    try {
        const [item] = await db.select().from(pages).where(eq(pages.id, req.params.id as string));
        if (!item) res.status(404).json({ error: 'Page not found' });
        else res.json(item);
    } catch (error) {
        console.error('Error fetching page:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function createPage(req: Request, res: Response): Promise<void> {
    try {
        const body = req.body as ReturnType<typeof pageSchema.parse>;
        if (await slugTaken(body.slug)) { conflict(res, body.slug); return; }
        const [last] = await db.select({ o: pages.displayOrder }).from(pages).orderBy(desc(pages.displayOrder)).limit(1);
        const [row] = await db.insert(pages).values({
            ...body, displayOrder: body.displayOrder ?? (last?.o ?? 0) + 1, isSystem: false,
        }).returning();
        res.status(201).json(row);
    } catch (error) {
        console.error('Error creating page:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function updatePage(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const body = req.body as ReturnType<typeof pageSchema.parse>;
        const [current] = await db.select().from(pages).where(eq(pages.id, id));
        if (!current) { res.status(404).json({ error: 'Page not found' }); return; }
        if (current.isSystem && body.slug !== current.slug) {
            res.status(400).json({ error: 'Bad Request', message: `"${current.title}" is a main page; its address /${current.slug} cannot change` });
            return;
        }
        if (await slugTaken(body.slug, id)) { conflict(res, body.slug); return; }
        const [row] = await db.update(pages).set({ ...body, updatedAt: new Date() }).where(eq(pages.id, id)).returning();
        res.json(row);
    } catch (error) {
        console.error('Error updating page:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function deletePage(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [current] = await db.select().from(pages).where(eq(pages.id, id));
        if (!current) { res.status(404).json({ error: 'Page not found' }); return; }
        if (current.isSystem) {
            res.status(400).json({ error: 'Bad Request', message: `"${current.title}" is a main page and cannot be deleted. Hide its sections or unpublish it instead.` });
            return;
        }
        await db.delete(pages).where(eq(pages.id, id));
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('Error deleting page:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/** GET /api/public/pages — published pages, hidden sections removed. */
export async function getPublicPages(_req: Request, res: Response): Promise<void> {
    try {
        const rows = await db.select().from(pages).where(eq(pages.isPublished, true)).orderBy(asc(pages.displayOrder));
        res.json(rows.map((p) => ({
            slug: p.slug, title: p.title, seo: p.seo,
            sections: p.sections.filter((s) => s.visible !== false),
        })));
    } catch (error) {
        console.error('Error fetching public pages:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
