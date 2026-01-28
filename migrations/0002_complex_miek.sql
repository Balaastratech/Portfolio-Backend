CREATE TABLE "about_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_fit_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(20) NOT NULL,
	"text" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"icon_name" varchar(50) NOT NULL,
	"duration" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "permissions" jsonb DEFAULT '{"dashboard":true,"projects":false,"services":false,"capabilities":false,"clientFit":false,"process":false,"about":false,"techStack":false,"trustSignals":false,"media":false,"inbox":false,"siteConfig":false,"formOptions":false,"users":false}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "about_items_display_order_idx" ON "about_items" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "client_fit_items_type_idx" ON "client_fit_items" USING btree ("type");--> statement-breakpoint
CREATE INDEX "client_fit_items_display_order_idx" ON "client_fit_items" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "process_steps_display_order_idx" ON "process_steps" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "admin_users_status_idx" ON "admin_users" USING btree ("status");