-- v2 project pages (W3, night 12-10-2026). Additive only: no column is dropped or renamed, so the
-- current live site and admin keep working. Safe to run twice (IF NOT EXISTS everywhere).
-- Rollback: migrations/rollback/0004_project_pages.down.sql
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "slug" varchar(120);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'demo' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "show_in_nav" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "data_label" varchar(80) DEFAULT 'Demo · sample data' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "page" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "price_plans" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "demos" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "live_link" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "screenshots" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "story" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "features" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "faq" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "cta" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "seo" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
-- Backfill slugs for existing rows from the title (kebab-case); duplicates get -2, -3 … in display order.
WITH base AS (
  SELECT id, display_order, created_at,
         COALESCE(NULLIF(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), ''), 'project') AS s
  FROM "projects" WHERE "slug" IS NULL
), numbered AS (
  SELECT id, s, row_number() OVER (PARTITION BY s ORDER BY display_order, created_at) AS n FROM base
)
UPDATE "projects" p SET "slug" = left(CASE WHEN n.n = 1 THEN n.s ELSE n.s || '-' || n.n END, 120)
FROM numbered n WHERE p.id = n.id;--> statement-breakpoint
-- A pre-existing row could already own a backfilled slug; make any clash unique with the row id.
UPDATE "projects" p SET "slug" = left(p."slug", 111) || '-' || left(p.id::text, 8)
WHERE EXISTS (SELECT 1 FROM "projects" q WHERE q."slug" = p."slug" AND q.id < p.id);--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_idx" ON "projects" USING btree ("slug");
