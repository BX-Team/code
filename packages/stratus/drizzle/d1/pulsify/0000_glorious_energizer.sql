CREATE TABLE `pulsify_alert_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`threshold` integer DEFAULT 10 NOT NULL,
	`window_minutes` integer DEFAULT 5 NOT NULL,
	`webhook_url` text NOT NULL,
	`last_fired_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `pulsify_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "pulsify_alert_type_check" CHECK("pulsify_alert_rules"."type" in ('new_issue', 'regression', 'error_spike'))
);
--> statement-breakpoint
CREATE TABLE `pulsify_daily_usage` (
	`token` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`token`, `day`)
);
--> statement-breakpoint
CREATE TABLE `pulsify_dsn_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`key` text NOT NULL,
	`label` text,
	`revoked` integer DEFAULT false NOT NULL,
	`last_used_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `pulsify_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pulsify_dsn_tokens_key_unique` ON `pulsify_dsn_tokens` (`key`);--> statement-breakpoint
CREATE TABLE `pulsify_resolved_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`plugin` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`status_version` text,
	`muted_until` integer,
	`first_version` text,
	`last_version` text,
	`first_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_at` integer,
	`resolved_by` text,
	FOREIGN KEY (`project_id`) REFERENCES `pulsify_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "pulsify_issue_status_check" CHECK("pulsify_resolved_issues"."status" in ('open', 'resolved', 'ignored', 'muted'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pulsify_resolved_issues_project_fingerprint_unique` ON `pulsify_resolved_issues` (`project_id`,`fingerprint`);--> statement-breakpoint
CREATE TABLE `pulsify_plugin_installations` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`server_id` text NOT NULL,
	`version` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`share_errors` integer DEFAULT true NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `pulsify_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`server_id`) REFERENCES `pulsify_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pulsify_plugin_installations_plugin_server_unique` ON `pulsify_plugin_installations` (`plugin_id`,`server_id`);--> statement-breakpoint
CREATE TABLE `pulsify_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`verified` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "pulsify_projects_type_check" CHECK("pulsify_projects"."type" in ('server', 'plugin', 'mod'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pulsify_projects_slug_unique` ON `pulsify_projects` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `pulsify_plugin_name_unique` ON `pulsify_projects` (`name`) WHERE "pulsify_projects"."type" in ('plugin', 'mod');--> statement-breakpoint
CREATE TABLE `pulsify_quotas` (
	`user_id` text PRIMARY KEY NOT NULL,
	`max_projects` integer DEFAULT 10 NOT NULL,
	`max_events_per_day` integer DEFAULT 100000 NOT NULL,
	`reset_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pulsify_server_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`software` text,
	`mc_version` text,
	`country_code` text,
	FOREIGN KEY (`project_id`) REFERENCES `pulsify_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pulsify_server_metadata_project_unique` ON `pulsify_server_metadata` (`project_id`);