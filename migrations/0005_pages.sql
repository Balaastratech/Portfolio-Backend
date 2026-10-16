-- Website pages built from ordered sections (admin: Content → Pages), and the email-delivery status
-- of each enquiry (admin: Leads → Inbox). Additive only; safe to run twice.
-- Rollback: migrations/rollback/0005_pages.down.sql
CREATE TABLE IF NOT EXISTS "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(255) NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pages_slug_idx" ON "pages" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "email_status" varchar(20) DEFAULT 'unknown' NOT NULL;
