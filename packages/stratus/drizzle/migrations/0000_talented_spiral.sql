CREATE TYPE "public"."channel" AS ENUM('ALPHA', 'BETA', 'STABLE');--> statement-breakpoint
CREATE TYPE "public"."support_status" AS ENUM('SUPPORTED', 'DEPRECATED', 'UNSUPPORTED');--> statement-breakpoint
CREATE TYPE "public"."pulsify_project_type" AS ENUM('server', 'plugin', 'mod');--> statement-breakpoint
CREATE TABLE "atlas_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"latest_version" text,
	"experimental_version" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "atlas_projects_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "atlas_builds" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"build_number" integer NOT NULL,
	"channel" "channel" DEFAULT 'STABLE' NOT NULL,
	"time" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atlas_commits" (
	"id" serial PRIMARY KEY NOT NULL,
	"build_id" integer NOT NULL,
	"sha" text NOT NULL,
	"message" text NOT NULL,
	"time" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atlas_downloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"build_id" integer NOT NULL,
	"name" text NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atlas_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"key" text NOT NULL,
	"support_status" "support_status" DEFAULT 'SUPPORTED' NOT NULL,
	"java_min_version" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pulsify_dsn_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text,
	"revoked" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pulsify_dsn_tokens_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "pulsify_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"plugin" text NOT NULL,
	"message" text NOT NULL,
	"stacktrace" text NOT NULL,
	"level" text DEFAULT 'error' NOT NULL,
	"hash" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "pulsify_errors_project_id_hash_unique" UNIQUE("project_id","hash")
);
--> statement-breakpoint
CREATE TABLE "pulsify_plugin_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plugin_id" uuid NOT NULL,
	"server_id" uuid NOT NULL,
	"version" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pulsify_plugin_installations_plugin_id_server_id_unique" UNIQUE("plugin_id","server_id")
);
--> statement-breakpoint
CREATE TABLE "pulsify_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "pulsify_project_type" NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pulsify_projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pulsify_server_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"software" text,
	"mc_version" text,
	"country_code" text,
	CONSTRAINT "pulsify_server_metadata_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "atlas_builds" ADD CONSTRAINT "atlas_builds_version_id_atlas_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."atlas_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atlas_commits" ADD CONSTRAINT "atlas_commits_build_id_atlas_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."atlas_builds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atlas_downloads" ADD CONSTRAINT "atlas_downloads_build_id_atlas_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."atlas_builds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atlas_versions" ADD CONSTRAINT "atlas_versions_project_id_atlas_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."atlas_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulsify_dsn_tokens" ADD CONSTRAINT "pulsify_dsn_tokens_project_id_pulsify_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."pulsify_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulsify_errors" ADD CONSTRAINT "pulsify_errors_project_id_pulsify_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."pulsify_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulsify_plugin_installations" ADD CONSTRAINT "pulsify_plugin_installations_plugin_id_pulsify_projects_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."pulsify_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulsify_plugin_installations" ADD CONSTRAINT "pulsify_plugin_installations_server_id_pulsify_projects_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."pulsify_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulsify_projects" ADD CONSTRAINT "pulsify_projects_owner_id_auth_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulsify_server_metadata" ADD CONSTRAINT "pulsify_server_metadata_project_id_pulsify_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."pulsify_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "auth_verifications" USING btree ("identifier");