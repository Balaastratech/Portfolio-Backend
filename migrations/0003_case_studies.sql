CREATE TABLE IF NOT EXISTS "case_studies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_label" varchar(255) NOT NULL,
  "problem" text NOT NULL,
  "build" text NOT NULL,
  "result" text NOT NULL,
  "pillar_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "consent_confirmed" boolean DEFAULT false NOT NULL,
  "is_published" boolean DEFAULT false NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "case_studies_display_order_idx" ON "case_studies" ("display_order");
CREATE INDEX IF NOT EXISTS "case_studies_publish_gate_idx" ON "case_studies" ("is_published", "consent_confirmed");
