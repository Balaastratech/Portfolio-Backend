ALTER TABLE "admin_users" ADD COLUMN "is_email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "email_verify_token" varchar(10);--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "email_verify_expires" timestamp;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "password_reset_token" varchar(100);--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "password_reset_expires" timestamp;