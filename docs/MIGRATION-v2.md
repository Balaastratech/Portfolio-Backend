# Deploy-day steps for the v2 backend + admin — FOR YUVRAJ'S APPROVAL (nothing below has been run on live)

**In one line:** one database change that only *adds* columns (the current site keeps working), then deploy the
backend, then load the two new projects + contact details, then deploy the admin. About 30 minutes. Every step has an
undo.

Code: website copy `C:\Balaastra\.mc-worktrees\portfolio-v2-20261011`, backend + admin commits by W3 (see `git log`).
Tested only on a throwaway database (23 API tests + 28 admin-screen checks pass).

## Before you start (decide these)
1. **Which old projects stay visible?** The live database still has the v1 projects (e.g. "AI Support System",
   "Analytics Interface", "Booking Platform" in the old seed). They will show on the new site next to Lead Response
   Desk and Inventra unless you switch them off (Projects list → Published switch). Recommended: unpublish any you
   can't show a working demo for (no-invented-results rule).
2. **Deploy together with W2's new website.** Step 4 publishes Lead Response Desk + Inventra; the *old* site would
   show them as plain cards in its old layout. So run step 4 right before the new frontend goes live.

## Steps (run from `backend/`, with the live `DATABASE_URL` in your shell — never paste it into a chat)

**1. Backup (2 min).**
```
pg_dump "$DATABASE_URL" -Fc -f backup-2026-10-XX-before-v2.dump
psql "$DATABASE_URL" -c "\copy (select * from site_configuration) to 'site_configuration-before-v2.csv' csv header"
```
Check the file is not empty: `pg_restore -l backup-…dump | head`.

**2. Database change (1 min).** Additive and safe to run twice:
```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f migrations/0003_case_studies.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f migrations/0004_project_pages.sql
psql "$DATABASE_URL" -c "select title, slug, status, is_published from projects order by display_order"
```
Expect: every project has a slug (`ai-support-system`, …); duplicates get `-2`. (`0003` is listed because it was
missing from drizzle's list; on live it already exists, so it does nothing.)
*Why psql and not `npm run db:migrate`:* we don't know how the live database was migrated before; the hand-run files
don't depend on that history.

**3. Deploy the backend** (Vercel project behind `portfoliobackend-lemon.vercel.app`). No new environment variables.
Check:
- `GET /health` → ok
- `GET /api/public/projects` → same projects as before, now with `slug`, `pricePlans`, `demos` …
- The **current live site** still renders its portfolio (it only reads the old fields).

**4. Load v2 content (1 min, right before the new site goes live — see decision 2).**
```
npx tsx scripts/seed-production.ts --dry-run   &&   npx tsx scripts/seed-production.ts   (see docs/v2-spec/DEPLOY-DAY.md)
```
Upserts Lead Response Desk + Inventra by slug and 13 SiteSettings keys. **It overwrites `contact_email`** (now
yuvraj@balaastratech.com, was balaastratech@gmail.com) **and `social_links`** (now the 7-row list). It deletes
nothing. (Never run the old `npm run db:seed` on live — it wipes every table.)
Check: `GET /api/public/projects/lead-response-desk` shows UK £79/mo + £195 setup, India ₹2,999/mo + ₹7,500.

**5. Deploy the admin panel** (its Vercel project). No new environment variables. Log in and check:
Projects list shows Page/Published columns · edit Lead Response Desk → Prices / Demo videos / Live link tabs ·
Site Config → "Contact & social links (new site)" shows 7 links (LinkedIn company hidden).

**6. Your part in the admin (10 min):** unpublish old projects (decision 1); upload the demo videos for each project
(Demo videos tab → Upload, or paste a YouTube/Loom link); turn on the LinkedIn company link if you want it.

## Rollback (any step)
- **Backend or admin misbehaves:** Vercel → Deployments → previous deployment → *Instant Rollback*. The database
  change is additive, so the old code runs fine on the new columns.
- **Contact details/social links wrong after step 4:** fix them in the admin (Site Config → "Contact & social
  links"). The old values are in `site_configuration-before-v2.csv` from step 1 if you want them back exactly.
- **Remove the two seeded projects:** Projects list → Delete (or unpublish).
- **Undo the database change completely** (drops ONLY the new columns; v2 prices/videos/links typed since are lost):
  `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f migrations/rollback/0004_project_pages.down.sql`
  — only after rolling the backend back first (v2 backend needs the columns).
- **Last resort:** `pg_restore --clean --if-exists -d "$DATABASE_URL" backup-…dump` (restores everything to step 1,
  including losing any inbox messages that arrived since).

## What changed in behaviour you might notice
- The admin no longer logs you out after a few page loads (bug fixed).
- Media upload signatures and deletes now need a login (they were open to anyone).
- The contact form accepts messages without a budget (the v2 form has none); they show "not asked".
