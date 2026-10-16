-- Rollback for 0004_project_pages. Drops ONLY the v2 columns; every pre-v2 column and row is untouched.
-- WARNING: v2 content typed into the admin (prices, demos, live links, story…) is lost — take the
-- backup in MIGRATION.md step 1 first. Run inside a transaction:  BEGIN; \i this-file; COMMIT;
DROP INDEX IF EXISTS "projects_slug_idx";
ALTER TABLE "projects"
  DROP COLUMN IF EXISTS "slug",
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "show_in_nav",
  DROP COLUMN IF EXISTS "data_label",
  DROP COLUMN IF EXISTS "page",
  DROP COLUMN IF EXISTS "price_plans",
  DROP COLUMN IF EXISTS "demos",
  DROP COLUMN IF EXISTS "live_link",
  DROP COLUMN IF EXISTS "screenshots",
  DROP COLUMN IF EXISTS "story",
  DROP COLUMN IF EXISTS "features",
  DROP COLUMN IF EXISTS "faq",
  DROP COLUMN IF EXISTS "cta",
  DROP COLUMN IF EXISTS "seo";
-- To re-apply later, run 0004_project_pages.sql by hand (it is idempotent); see MIGRATION.md.
