CREATE TABLE "pulsify_resolved_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"resolved_at" timestamp DEFAULT now() NOT NULL,
	"resolved_by" text,
	CONSTRAINT "pulsify_resolved_issues_project_id_fingerprint_unique" UNIQUE("project_id","fingerprint")
);
--> statement-breakpoint
ALTER TABLE "pulsify_resolved_issues" ADD CONSTRAINT "pulsify_resolved_issues_project_id_pulsify_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."pulsify_projects"("id") ON DELETE cascade ON UPDATE no action;