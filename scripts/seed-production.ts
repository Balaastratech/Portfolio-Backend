// Deploy day, run by Yuvraj: put the seed (products, pages, menu/footer, settings) on the LIVE site.
//  1. Uploads every image/video the seed points at (/media/… = backend/.local-media/…) to Cloudinary,
//     under fixed names (balaastra-portfolio/seed/<product>/<file>), so a re-run reuses them instead of
//     uploading twice.
//  2. Writes the rows to the database in DATABASE_URL. Rows that already exist are KEPT (his admin edits
//     win); add --overwrite to replace them with the seed.
//   npx tsx scripts/seed-production.ts --dry-run     ← shows what it would do; uploads and writes nothing
//   npx tsx scripts/seed-production.ts               ← does it
// Needs DATABASE_URL and CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET in backend/.env. Run the migration first.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIMIT_MB = 100; // Cloudinary free plan: largest video it accepts
export const MEDIA_RE = /^\/media\/([\w.-]+\/)*[\w.-]+$/;
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), path.basename(path.dirname(path.dirname(fileURLToPath(import.meta.url)))) === 'dist' ? '../..' : '..');
export const MEDIA_DIR = path.join(backendDir, '.local-media');

export interface MediaFile { url: string; file: string; publicId: string; video: boolean; mb: number | null }

/** Every distinct /media/… path anywhere in the seed, with its local file and its fixed Cloudinary name. */
export function collectMedia(seed: unknown, mediaDir = MEDIA_DIR): MediaFile[] {
    const urls = new Set<string>();
    const walk = (v: unknown): void => {
        if (typeof v === 'string') { if (MEDIA_RE.test(v)) urls.add(v); return; }
        if (Array.isArray(v)) { v.forEach(walk); return; }
        if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(seed);
    return [...urls].sort().map((url) => {
        const rel = url.slice('/media/'.length);
        const file = path.join(mediaDir, rel);
        const exists = fs.existsSync(file);
        return {
            url, file,
            publicId: `balaastra-portfolio/seed/${rel.replace(/\.[^.]+$/, '')}`,
            video: /\.(mp4|mov|webm)$/i.test(rel),
            mb: exists ? fs.statSync(file).size / 1024 / 1024 : null,
        };
    });
}

/** Same seed with every /media/… path swapped for its Cloudinary URL; uploaded demo videos are marked as uploads. */
export function rewriteSeed<T>(seed: T, urls: Map<string, { url: string; publicId: string }>): T {
    const swap = (v: unknown): unknown => {
        if (typeof v === 'string') return urls.get(v)?.url ?? v;
        if (Array.isArray(v)) return v.map(swap);
        if (v && typeof v === 'object') {
            const o = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]));
            const up = typeof (v as { url?: unknown }).url === 'string' ? urls.get((v as { url: string }).url) : undefined;
            if (up && 'source' in o && 'featured' in o) Object.assign(o, { source: 'upload', mediaId: up.publicId });
            return o;
        }
        return v;
    };
    return swap(seed) as T;
}

/** Problems that stop the run before anything is uploaded or written. */
export function mediaProblems(files: MediaFile[]): string[] {
    return files.flatMap((f) => {
        if (f.mb === null) return [`Missing file ${f.file} (for ${f.url}). Copy it into backend/.local-media first.`];
        if (f.video && f.mb > LIMIT_MB) return [`${path.basename(f.file)} is ${f.mb.toFixed(0)} MB; the Cloudinary limit is ${LIMIT_MB} MB. Run: node scripts/compress-video.mjs "${f.file}"`];
        return [];
    });
}

async function main() {
    const args = process.argv.slice(2);
    const dry = args.includes('--dry-run');
    const overwrite = args.includes('--overwrite');
    const { loadSeed, seedV2, SEED_FILE } = await import('../seeds/seed-v2.js');
    const seed = loadSeed();
    const files = collectMedia(seed);
    console.log(`Seed: ${SEED_FILE}`);
    console.log(`${seed.projectRows.length} products, ${seed.pageRows.length} pages, ${seed.settings.length} settings, ${files.length} media files\n`);

    const problems = mediaProblems(files);
    if (problems.length) { problems.forEach((p) => console.error('✗ ' + p)); process.exit(1); }

    const { env } = await import('../src/config/env.js');
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
    const haveCloud = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

    const urls = new Map<string, { url: string; publicId: string }>();
    for (const f of files) {
        const type = f.video ? 'video' : 'image';
        if (dry) { console.log(`would upload  ${f.url}  (${f.mb!.toFixed(1)} MB) → ${f.publicId}`); continue; }
        if (!haveCloud) { console.error('✗ Cloudinary keys missing in backend/.env'); process.exit(1); }
        const existing = await cloudinary.api.resource(f.publicId, { resource_type: type }).catch(() => null);
        if (existing) {
            urls.set(f.url, { url: existing.secure_url, publicId: f.publicId });
            console.log(`already there ${f.url} → ${existing.secure_url}`);
            continue;
        }
        const opts = { public_id: f.publicId, resource_type: type, overwrite: false, unique_filename: false } as const;
        // Videos go up in 20 MB chunks (upload_large), so a slow line or a big file never times out in one request.
        const r = f.video
            ? await new Promise<{ secure_url: string }>((ok, fail) => cloudinary.uploader.upload_large(f.file, { ...opts, chunk_size: 20_000_000 }, (e, res) => (e || !res ? fail(e) : ok(res))))
            : await cloudinary.uploader.upload(f.file, opts);
        urls.set(f.url, { url: r.secure_url, publicId: f.publicId });
        console.log(`uploaded      ${f.url} → ${r.secure_url}`);
    }

    if (!env.DATABASE_URL) { console.log('\nNo DATABASE_URL: skipped the database step.'); return; }
    const { db, pool } = await import('../src/config/database.js');
    try {
        const { pages, projects, siteConfiguration } = await import('../src/db/schema.js');
        const have = {
            projects: new Set((await db.select({ s: projects.slug }).from(projects)).map((r) => r.s)),
            pages: new Set((await db.select({ s: pages.slug }).from(pages)).map((r) => r.s)),
            settings: new Set((await db.select({ s: siteConfiguration.key }).from(siteConfiguration)).map((r) => r.s)),
        };
        const verb = (exists: boolean) => (exists ? (overwrite ? 'replace' : 'keep   ') : 'add    ');
        seed.projectRows.forEach((p) => console.log(`${verb(have.projects.has(p.slug))} product  ${p.slug}`));
        seed.pageRows.forEach((p) => console.log(`${verb(have.pages.has(p.slug))} page     ${p.slug}`));
        seed.settings.forEach((s) => console.log(`${verb(have.settings.has(s.key))} setting  ${s.key}`));
        if (dry) { console.log('\nDry run: nothing uploaded, nothing written.'); return; }
        const r = await seedV2(db, rewriteSeed(seed, urls), { overwrite });
        console.log(`\nDone: ${r.projects} products, ${r.pages} pages, ${r.settings} settings written; ${r.kept} kept as they were.`);
    } finally {
        await pool.end();
    }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
