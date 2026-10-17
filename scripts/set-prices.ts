// Deploy day, run by Yuvraj: put the approved starting prices (DEC-20261017-PRICES-APPROVED) on the LIVE site
// without touching anything else he has edited in the admin (videos, text, screenshots stay as they are).
// From the seed file it copies only:
//   - every product's price plans (matched by slug; a product missing on live is reported, not created),
//   - the closing lines of Lead Response Desk and Inventra that promised "a fixed price",
//   - the whole Pricing page (its sections and SEO),
//   - the "fixed price" sentence on Home and the "scoped and priced" sentence on Products, only where the old
//     wording is still there.
//   npx tsx scripts/set-prices.ts            ← dry run: lists what would change, writes nothing
//   npx tsx scripts/set-prices.ts --apply    ← writes it, in one transaction
// Needs DATABASE_URL in backend/.env.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { pages, projects } from '../src/db/schema.js';
import { loadSeed, SEED_FILE } from '../seeds/seed-v2.js';

const CLOSING_SLUGS = ['lead-response-desk', 'inventra'];
const TEXT_SWAPS: [string, string][] = [
    ['and a fixed price.', 'and your exact price.'],
    ['Every project is scoped and priced after a 20-minute call.', 'Each shows its starting price; your exact price comes after a 20-minute call.'],
];

type Seed = ReturnType<typeof loadSeed>;
// Postgres jsonb stores keys in its own order, so compare with sorted keys.
const sorted = (v: unknown): unknown => Array.isArray(v) ? v.map(sorted)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted((v as Record<string, unknown>)[k])])) : v;
const same = (a: unknown, b: unknown) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

export async function setPrices(db: NodePgDatabase<any>, seed: Seed = loadSeed(SEED_FILE), { apply = false } = {}) {
    const changes: string[] = [];
    const missing: string[] = [];
    const run = async (tx: NodePgDatabase<any>) => {
        for (const p of seed.projectRows) {
            const [row] = await tx.select({ id: projects.id, page: projects.page, pricePlans: projects.pricePlans })
                .from(projects).where(eq(projects.slug, p.slug));
            if (!row) { missing.push(p.slug); continue; }
            const set: Record<string, unknown> = {};
            if (!same(row.pricePlans, p.pricePlans)) set.pricePlans = p.pricePlans;
            const closing = p.page?.closing;
            if (CLOSING_SLUGS.includes(p.slug) && closing && !same(row.page.closing, closing)) set.page = { ...row.page, closing };
            if (!Object.keys(set).length) continue;
            changes.push(`product ${p.slug}: ${Object.keys(set).join(', ')}`);
            if (apply) await tx.update(projects).set({ ...set, updatedAt: new Date() }).where(eq(projects.id, row.id));
        }
        for (const slug of ['pricing', 'home', 'products']) {
            const [row] = await tx.select({ id: pages.id, sections: pages.sections, seo: pages.seo }).from(pages).where(eq(pages.slug, slug));
            if (!row) { missing.push(`page ${slug}`); continue; }
            let set: { sections: unknown; seo?: unknown };
            if (slug === 'pricing') {
                const want = seed.pageRows.find((x) => x.slug === 'pricing')!;
                if (same(row.sections, want.sections) && same(row.seo, want.seo)) continue;
                set = { sections: want.sections, seo: want.seo };
            } else {
                const text = TEXT_SWAPS.reduce((s, [from, to]) => s.split(from).join(to), JSON.stringify(row.sections));
                if (text === JSON.stringify(row.sections)) continue;
                set = { sections: JSON.parse(text) };
            }
            changes.push(`page ${slug}: ${Object.keys(set).join(', ')}`);
            if (apply) await tx.update(pages).set({ ...set, updatedAt: new Date() } as never).where(eq(pages.id, row.id));
        }
    };
    if (apply) await db.transaction(run as never); else await run(db);
    return { changes, missing };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const apply = process.argv.includes('--apply');
    const { db, pool } = await import('../src/config/database.js');
    try {
        const { changes, missing } = await setPrices(db, loadSeed(SEED_FILE), { apply });
        for (const c of changes) console.log(`${apply ? 'changed' : 'would change'}  ${c}`);
        for (const m of missing) console.log(`not on live (skipped)  ${m}`);
        console.log(apply ? `\nDone: ${changes.length} rows changed.` : `\nDry run: ${changes.length} rows would change, nothing written. Add --apply to write.`);
    } finally {
        await pool.end();
    }
}
