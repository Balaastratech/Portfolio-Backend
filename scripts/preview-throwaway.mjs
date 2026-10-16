// Local preview on a throwaway in-memory database (gone when you stop it). Never touches the live DB,
// never uploads anything. Seeded from frontend/src/content/seed.json — the same file the site falls back to.
// Images and videos come from backend/.local-media (git-ignored), served at http://127.0.0.1:3001/media/…
//   From backend/:     npm run preview:throwaway
//   Admin (:5174):     cd admin-panel && set VITE_API_BASE_URL=http://127.0.0.1:3001/api&& set VITE_SITE_URL=http://127.0.0.1:8092&& npm run dev -- --port 5174
//   Site (:8092):      cd frontend && set VITE_API_BASE_URL=http://127.0.0.1:3001/api&& npm run build && set PORT=8092&& npm run preview
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mediaDir = path.join(backendDir, '.local-media');
process.env.LOCAL_MEDIA_DIR = mediaDir;
// PREVIEW_EXTRA_ORIGINS: comma list when the admin/site run on other ports (e.g. http://127.0.0.1:5184)
process.env.CORS_ORIGIN = ['http://127.0.0.1:5174', 'http://localhost:5174', 'http://127.0.0.1:8092', 'http://localhost:8092',
    ...(process.env.PREVIEW_EXTRA_ORIGINS ?? '').split(',').filter(Boolean)].join(',');

const { startThrowaway, createAdmin } = await import('../tests/helpers/throwaway.mjs');
const EMAIL = 'preview@local.test';
const PASSWORD = 'Preview-only!1'; // throwaway DB in memory; not a real account

const t = await startThrowaway({ appPort: Number(process.env.PREVIEW_PORT || 3001) });
await createAdmin(t.db, { email: EMAIL, password: PASSWORD });
const { seedV2, loadSeed } = await import('../dist/seeds/seed-v2.js');
const seed = loadSeed();
const seeded = await seedV2(t.db, seed);

// Every /media/… file the seed points at must exist locally, or the preview shows broken videos.
const missing = JSON.stringify(seed).match(/\/media\/[\w./-]+/g)?.filter((u) => !fs.existsSync(path.join(mediaDir, u.slice('/media/'.length)))) ?? [];

console.log(`\nThrowaway preview API: ${t.baseUrl}  (seeded ${seeded.projects} products, ${seeded.pages} pages, ${seeded.settings} settings)`);
console.log(`Admin login (local only): ${EMAIL} / ${PASSWORD}`);
if (missing.length) console.log(`Missing local media (copy them into backend/.local-media): ${[...new Set(missing)].join(', ')}`);
console.log('Ctrl+C to stop — everything is discarded.\n');

process.on('SIGINT', async () => { await t.stop(); process.exit(0); });
