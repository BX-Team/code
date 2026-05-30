CREATE TYPE "public"."pulsify_alert_type" AS ENUM('new_issue', 'regression', 'error_spike');--> statement-breakpoint
CREATE TYPE "public"."pulsify_issue_status" AS ENUM('open', 'resolved', 'ignored', 'muted');--> statement-breakpoint
CREATE TABLE "pulsify_alert_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "pulsify_alert_type" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"threshold" integer DEFAULT 10 NOT NULL,
	"window_minutes" integer DEFAULT 5 NOT NULL,
	"webhook_url" text NOT NULL,
	"last_fired_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pulsify_resolved_issues" ALTER COLUMN "resolved_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "pulsify_resolved_issues" ALTER COLUMN "resolved_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pulsify_resolved_issues" ADD COLUMN "plugin" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pulsify_resolved_issues" ADD COLUMN "status" "pulsify_issue_status" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "pulsify_resolved_issues" ADD COLUMN "status_version" text;--> statement-breakpoint
ALTER TABLE "pulsify_resolved_issues" ADD COLUMN "muted_until" timestamp;--> statement-breakpoint
ALTER TABLE "pulsify_resolved_issues" ADD COLUMN "first_version" text;--> statement-breakpoint
ALTER TABLE "pulsify_resolved_issues" ADD COLUMN "last_version" text;--> statement-breakpoint
ALTER TABLE "pulsify_resolved_issues" ADD COLUMN "first_seen_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pulsify_resolved_issues" ADD COLUMN "last_seen_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "pulsify_resolved_issues" SET "status" = 'resolved', "resolved_at" = COALESCE("resolved_at", now());--> statement-breakpoint
ALTER TABLE "pulsify_alert_rules" ADD CONSTRAINT "pulsify_alert_rules_project_id_pulsify_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."pulsify_projects"("id") ON DELETE cascade ON UPDATE no action;