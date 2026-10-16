// Seeds the website content — products, pages (sections), site settings — from the ONE seed file the
// public site also ships as its offline fallback: frontend/src/content/seed.json. Admin and site therefore
// start from the same data.
// Upserts only: projects and pages by slug, settings by key. Never deletes anything (unlike seeds/seed.ts).
// overwrite=false keeps rows that already exist (so a re-run never undoes his admin edits).
// Usage (from backend/): npx tsx seeds/seed-v2.ts [path/to/seed.json] [--yes-remote]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { pages, projects, siteConfiguration } from '../src/db/schema.js';
import { pageSchema, projectV2Fields, settingsKeySchemas } from '../src/db/content.js';

const here = path.dirname(fileURLToPath(import.meta.url)); // backend/seeds or backend/dist/seeds
const backendDir = path.resolve(here, path.basename(path.dirname(here)) === 'dist' ? '../..' : '..');
export const SEED_FILE = path.resolve(backendDir, '../frontend/src/content/seed.json');

const seedProjectSchema = z.object({
    title: z.string().min(1),
    category: z.string().min(1),
    shortDescription: z.string().min(1),
    fullDescription: z.string().min(1),
    displayOrder: z.number().int(),
    isPublished: z.boolean(),
    ...projectV2Fields,
    slug: projectV2Fields.slug.unwrap(),
});
const seedPageSchema = pageSchema.extend({ isSystem: z.boolean().default(false), displayOrder: z.number().int() });

export function loadSeed(file = SEED_FILE) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const projectRows = z.array(seedProjectSchema).parse(raw.projects);
    const pageRows = z.array(seedPageSchema).parse(raw.pages ?? []);
    const settings = Object.entries(raw.settings as Record<string, unknown>).map(([key, value]) => {
        const schema = settingsKeySchemas[key];
        return { key, value: schema ? schema.parse(value) : value };
    });
    return { projectRows, pageRows, settings };
}

type Seed = ReturnType<typeof loadSeed>;

export async function seedV2(db: NodePgDatabase<any>, file: string | Seed = SEED_FILE, { overwrite = true } = {}) {
    const { projectRows, pageRows, settings } = typeof file === 'string' ? loadSeed(file) : file;
    const result = { projects: 0, pages: 0, settings: 0, kept: 0 };
    await db.transaction(async (tx) => {
        for (const p of projectRows) {
            const [existing] = await tx.select({ id: projects.id }).from(projects).where(eq(projects.slug, p.slug));
            if (existing && !overwrite) { result.kept++; continue; }
            if (existing) await tx.update(projects).set({ ...p, updatedAt: new Date() }).where(eq(projects.id, existing.id));
            else await tx.insert(projects).values({ ...p, specifications: [], techStack: [] });
            result.projects++;
        }
        for (const p of pageRows) {
            const [existing] = await tx.select({ id: pages.id }).from(pages).where(eq(pages.slug, p.slug));
            if (existing && !overwrite) { result.kept++; continue; }
            if (existing) await tx.update(pages).set({ ...p, updatedAt: new Date() }).where(eq(pages.id, existing.id));
            else await tx.insert(pages).values(p);
            result.pages++;
        }
        for (const s of settings) {
            if (!overwrite) {
                const [existing] = await tx.select({ id: siteConfiguration.id }).from(siteConfiguration).where(eq(siteConfiguration.key, s.key));
                if (existing) { result.kept++; continue; }
            }
            await tx.insert(siteConfiguration).values(s).onConflictDoUpdate({
                target: siteConfiguration.key,
                set: { value: sql`excluded.value`, updatedAt: new Date() },
            });
            result.settings++;
        }
    });
    return result;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const args = process.argv.slice(2);
    const file = args.find((a) => !a.startsWith('--')) ?? SEED_FILE;
    const { env } = await import('../src/config/env.js');
    const host = (() => { try { return new URL(env.DATABASE_URL).hostname; } catch { return ''; } })();
    if (!['localhost', '127.0.0.1', '::1'].includes(host) && !args.includes('--yes-remote')) {
        console.error(`Refusing to seed a non-local database (${host || 'unknown host'}). For the live site use scripts/seed-production.ts.`);
        process.exit(1);
    }
    const { db, pool } = await import('../src/config/database.js');
    try {
        const r = await seedV2(db, file);
        console.log(`v2 seed done: ${r.projects} projects, ${r.pages} pages, ${r.settings} settings keys`);
    } finally {
        await pool.end();
    }
}
