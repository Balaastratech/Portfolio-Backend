-- Rollback for 0005_pages. WARNING: every page and section edited in the admin is lost — take the
-- backup in MIGRATION.md step 1 first. Run inside a transaction:  BEGIN; \i this-file; COMMIT;
DROP TABLE IF EXISTS "pages";
ALTER TABLE "contact_submissions" DROP COLUMN IF EXISTS "email_status";
-- To re-apply later, run 0005_pages.sql by hand (it is idempotent).
