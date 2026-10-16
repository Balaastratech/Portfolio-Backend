// Migration 0004 on a database that looks like the live one (pre-v2 rows, duplicate titles):
// slugs backfill uniquely, old data is untouched, re-running is harmless, rollback restores the old shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const mig = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');
const sql = (f) => fs.readFileSync(path.join(mig, f), 'utf-8').split('--> statement-breakpoint').join('\n');

test('0004 backfills unique slugs, keeps old rows, is re-runnable and rolls back cleanly', async () => {
    const db = await PGlite.create();
    for (const f of ['0000_polite_spyke.sql', '0001_small_purple_man.sql', '0002_complex_miek.sql', '0003_case_studies.sql']) {
        await db.exec(sql(f));
    }
    await db.exec(`INSERT INTO projects (title, category, short_description, full_description, specifications, display_order)
        VALUES ('AI Support System','AI','s','f','["99%"]',1), ('AI Support System','AI','s','f','[]',2),
               ('Booking Platform!!','SaaS','s','f','[]',3), ('***','x','s','f','[]',4)`);

    await db.exec(sql('0004_project_pages.sql'));
    const rows = (await db.query('SELECT title, slug, status, price_plans, specifications FROM projects ORDER BY display_order')).rows;
    assert.deepEqual(rows.map((r) => r.slug), ['ai-support-system', 'ai-support-system-2', 'booking-platform', 'project']);
    assert.equal(rows[0].status, 'demo');
    assert.deepEqual(rows[0].price_plans, []);
    assert.deepEqual(rows[0].specifications, ['99%']); // old data untouched

    await db.exec(sql('0004_project_pages.sql')); // second run: no error, no change
    assert.equal((await db.query('SELECT count(DISTINCT slug)::int AS n FROM projects')).rows[0].n, 4);
    await assert.rejects(db.exec(`INSERT INTO projects (title, category, short_description, full_description, slug) VALUES ('x','x','s','f','booking-platform')`));

    await db.exec(fs.readFileSync(path.join(mig, 'rollback/0004_project_pages.down.sql'), 'utf-8'));
    const cols = (await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'`)).rows.map((r) => r.column_name);
    for (const c of ['slug', 'price_plans', 'demos', 'live_link']) assert.ok(!cols.includes(c), `${c} dropped`);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM projects')).rows[0].n, 4);

    await db.exec(sql('0004_project_pages.sql')); // can be re-applied after a rollback
    await db.close();
});
