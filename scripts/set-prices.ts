// Deploy day, run by Yuvraj: put the approved starting prices (DEC-20261017-PRICES-APPROVED) on the LIVE site
// without touching anything else he has edited in the admin (videos, text, screenshots stay as they are).
// From the seed file it copies only:
//   - each price plan's money (currency, setup, monthly), matched by plan id; a plan missing on live is added,
//     his own edits to a plan's label, terms and note stay (a product missing on live is reported, not created),
//   - offer 5's new name and copy (Deal-Call Voice Agent, DEC-20261017-COPILOT-PUBLISH): title, descriptions,
//     features, SEO and the page headline/lede/card lines (its videos, screenshots and FAQ stay as they are),
//   - the price wording listed in TEXT_SWAPS, only where the old wording is still there: the one-price-per-country
//     change (17-10, new USD = GBP x 1.33) turns "₹X · £Y · $Z" into a {₹X|£Y|$Z} token the site shows one of.
//   npx tsx scripts/set-prices.ts            ← dry run: lists what would change, writes nothing
//   npx tsx scripts/set-prices.ts --apply    ← writes it, in one transaction; a re-run is a no-op
// Needs DATABASE_URL in backend/.env. Connect timeout 20 s (PG_CONNECT_TIMEOUT_MS overrides).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { pages, projects } from '../src/db/schema.js';
import { loadSeed, SEED_FILE } from '../seeds/seed-v2.js';

const COPY_SLUG = 'negotiation-copilot';
const COPY_FIELDS = ['title', 'shortDescription', 'fullDescription', 'features', 'seo'] as const;
const COPY_PAGE_KEYS = ['headline', 'lede', 'cardTitle', 'cardBody'] as const;
const MONEY = ['currency', 'setup', 'monthly'] as const;
const TEXT_SWAPS: [string, string][] = [
    ['and a fixed price.', 'and your exact price.'],
    ['Every project is scoped and priced after a 20-minute call.', 'Each shows its starting price; your exact price comes after a 20-minute call.'],
    // one price per country (17-10)
    ['₹49,999 · £1,050 · $1,450', '{₹49,999|£1,050|$1,399}'],
    ['₹70 / $0.70', '{₹70|£0.53|$0.70}'],
    ['₹19,999 · £495 · $595', '{₹19,999|£495|$659}'],
    ['₹2,499 · £49 · $59', '{₹2,499|£49|$69}'],
    ['₹24,999 · £595 · $795', '{₹24,999|£595|$799}'],
    ['₹1,999 · £49 · $59', '{₹1,999|£49|$69}'],
    ['what that includes, in ₹, £ and $.', 'what that includes, priced for your country.'],
    ['in rupees, pounds and dollars, and what that includes', "priced for your business's country, and what that includes"],
];
const swap = <T>(v: T): T => JSON.parse(TEXT_SWAPS.reduce((s, [from, to]) => s.split(from).join(to), JSON.stringify(v)));

type Plan = Record<string, unknown> & { id: string };
/** Seed money onto live plans by id; live-only plans and his wording stay. */
function mergePlans(live: Plan[], want: Plan[]): Plan[] {
    const out = live.map((pl) => {
        const w = want.find((x) => x.id === pl.id);
        return w ? { ...pl, ...Object.fromEntries(MONEY.map((k) => [k, w[k]])) } : pl;
    });
    return [...out, ...want.filter((w) => !live.some((pl) => pl.id === w.id))];
}

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
            const [row] = await tx.select().from(projects).where(eq(projects.slug, p.slug));
            if (!row) { missing.push(p.slug); continue; }
            const set: Record<string, unknown> = {};
            const plans = swap(mergePlans((row.pricePlans ?? []) as Plan[], p.pricePlans as Plan[]));
            if (!same(row.pricePlans, plans)) set.pricePlans = plans;
            let page = swap(row.page);
            if (p.slug === COPY_SLUG) {
                for (const k of COPY_FIELDS) if (!same(row[k], p[k])) set[k] = p[k];
                page = { ...page, ...Object.fromEntries(COPY_PAGE_KEYS.map((k) => [k, p.page?.[k]])) };
            }
            if (!same(row.page, page)) set.page = page;
            if (!Object.keys(set).length) continue;
            changes.push(`product ${p.slug}: ${Object.keys(set).join(', ')}`);
            if (apply) await tx.update(projects).set({ ...set, updatedAt: new Date() }).where(eq(projects.id, row.id));
        }
        for (const row of await tx.select({ id: pages.id, slug: pages.slug, sections: pages.sections, seo: pages.seo }).from(pages)) {
            const set: Record<string, unknown> = {};
            for (const k of ['sections', 'seo'] as const) if (!same(row[k], swap(row[k]))) set[k] = swap(row[k]);
            if (!Object.keys(set).length) continue;
            changes.push(`page ${row.slug}: ${Object.keys(set).join(', ')}`);
            if (apply) await tx.update(pages).set({ ...set, updatedAt: new Date() } as never).where(eq(pages.id, row.id));
        }
    };
    if (apply) await db.transaction(run as never); else await run(db);
    return { changes, missing };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const apply = process.argv.includes('--apply');
    process.env.PG_CONNECT_TIMEOUT_MS ??= '20000'; // the 2 s app default fails from India to us-east-1
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
