CREATE TABLE "pulsify_quotas" (
	"user_id" text PRIMARY KEY NOT NULL,
	"max_projects" integer DEFAULT 10 NOT NULL,
	"max_events_per_day" integer DEFAULT 100000 NOT NULL,
	"reset_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pulsify_plugin_installations" ADD COLUMN "share_errors" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pulsify_projects" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pulsify_quotas" ADD CONSTRAINT "pulsify_quotas_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pulsify_plugin_name_unique" ON "pulsify_projects" USING btree ("name") WHERE "pulsify_projects"."type" in ('plugin', 'mod');