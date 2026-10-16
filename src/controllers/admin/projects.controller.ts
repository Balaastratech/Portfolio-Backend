import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { projects } from '../../db/schema.js';
import { eq, desc, asc, and, ne } from 'drizzle-orm';
import { z } from 'zod';
import { projectV2Fields, slugify } from '../../db/content.js';

// ============================================================================
// Validation Schemas
// ============================================================================

export const projectSchema = z.object({
    title: z.string().min(1),
    category: z.string().min(1),
    shortDescription: z.string().min(1),
    fullDescription: z.string().min(1),
    previewUrl: z.union([z.string().url(), z.literal('')]).nullable().optional(), // the form sends '' when empty
    specifications: z.array(z.string()),
    techStack: z.array(z.string()),
    isPublished: z.boolean().default(false),
    ...projectV2Fields,
});

export const publishSchema = z.object({ isPublished: z.boolean() });

// v2 keys copied straight from the validated body; undefined ones are skipped by drizzle,
// so the old form (which never sends them) cannot wipe v2 content.
const V2_KEYS = ['status', 'showInNav', 'dataLabel', 'page', 'pricePlans', 'demos', 'liveLink',
    'screenshots', 'story', 'features', 'faq', 'cta', 'seo'] as const;

function pickV2(body: Record<string, unknown>) {
    return Object.fromEntries(V2_KEYS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
}

async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    const where = exceptId ? and(eq(projects.slug, slug), ne(projects.id, exceptId)) : eq(projects.slug, slug);
    const [row] = await db.select({ id: projects.id }).from(projects).where(where).limit(1);
    return !!row;
}

async function freeSlug(title: string): Promise<string> {
    const base = slugify(title);
    for (let n = 1; ; n++) {
        const candidate = n === 1 ? base : `${base}-${n}`;
        if (!(await slugTaken(candidate))) return candidate;
    }
}

export const reorderSchema = z.object({
    items: z.array(z.object({
        id: z.string(),
        order: z.number().int(),
    })),
});

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * GET /api/admin/projects
 * Fetch all projects
 */
export async function getProjects(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db
            .select()
            .from(projects)
            .orderBy(asc(projects.displayOrder));
        res.json(data);
    } catch (error) {
        console.error('Error fetching admin projects:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getProjectById(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [item] = await db.select().from(projects).where(eq(projects.id, id));
        if (!item) res.status(404).json({ error: 'Project not found' });
        else res.json(item);
    } catch (error) {
        console.error('Error fetching project by id:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * POST /api/admin/projects
 * Create new project
 */
export async function createProject(req: Request, res: Response): Promise<void> {
    try {
        const {
            title, category, shortDescription, fullDescription,
            previewUrl, specifications, techStack, isPublished
        } = req.body;

        // Get max display order for append
        const existing = await db
            .select({ displayOrder: projects.displayOrder })
            .from(projects)
            .orderBy(desc(projects.displayOrder))
            .limit(1);

        const nextOrder = (existing[0]?.displayOrder || 0) + 1;

        if (req.body.slug && await slugTaken(req.body.slug)) {
            res.status(409).json({ error: 'Conflict', message: `Slug "${req.body.slug}" is already used by another project` });
            return;
        }
        const slug = req.body.slug || await freeSlug(title);

        const [newProject] = await db.insert(projects).values({
            ...pickV2(req.body),
            slug,
            title,
            category,
            shortDescription,
            fullDescription,
            previewUrl: previewUrl || null,
            specifications: specifications || [],
            techStack: techStack || [],
            isPublished: isPublished ?? false,
            displayOrder: nextOrder,
        }).returning();

        res.status(201).json(newProject);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * PUT /api/admin/projects/:id
 * Update existing project
 */
export async function updateProject(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const {
            title, category, shortDescription, fullDescription,
            previewUrl, specifications, techStack, isPublished
        } = req.body;

        if (req.body.slug && await slugTaken(req.body.slug, id)) {
            res.status(409).json({ error: 'Conflict', message: `Slug "${req.body.slug}" is already used by another project` });
            return;
        }

        const [updated] = await db
            .update(projects)
            .set({
                ...pickV2(req.body),
                slug: req.body.slug,
                title,
                category,
                shortDescription,
                fullDescription,
                previewUrl: previewUrl || null,
                specifications: specifications || [],
                techStack: techStack || [],
                isPublished: isPublished,
                updatedAt: new Date(),
            })
            .where(eq(projects.id, id))
            .returning();

        if (!updated) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * PATCH /api/admin/projects/:id/publish
 * Publish or unpublish one project without sending the whole form
 */
export async function setProjectPublished(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [updated] = await db
            .update(projects)
            .set({ isPublished: req.body.isPublished, updatedAt: new Date() })
            .where(eq(projects.id, id))
            .returning();
        if (!updated) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json(updated);
    } catch (error) {
        console.error('Error publishing project:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * DELETE /api/admin/projects/:id
 * Delete project
 */
export async function deleteProject(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [deleted] = await db
            .delete(projects)
            .where(eq(projects.id, id))
            .returning();

        if (!deleted) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * PATCH /api/admin/projects/reorder
 * Bulk update display order
 */
export async function reorderProjects(req: Request, res: Response): Promise<void> {
    try {
        const { items } = req.body;

        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx
                    .update(projects)
                    .set({ displayOrder: item.order })
                    .where(eq(projects.id, item.id));
            }
        });

        res.json({ message: 'Projects reordered successfully' });
    } catch (error) {
        console.error('Error reordering projects:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
