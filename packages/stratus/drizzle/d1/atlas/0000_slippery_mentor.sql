CREATE TABLE `atlas_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`latest_version` text,
	`experimental_version` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `atlas_projects_key_unique` ON `atlas_projects` (`key`);--> statement-breakpoint
CREATE TABLE `atlas_builds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version_id` integer NOT NULL,
	`build_number` integer NOT NULL,
	`channel` text DEFAULT 'STABLE' NOT NULL,
	`time` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`version_id`) REFERENCES `atlas_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "atlas_builds_channel_check" CHECK("atlas_builds"."channel" in ('ALPHA', 'BETA', 'STABLE'))
);
--> statement-breakpoint
CREATE INDEX `atlas_builds_version_build_number_idx` ON `atlas_builds` (`version_id`,`build_number`);--> statement-breakpoint
CREATE TABLE `atlas_commits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`build_id` integer NOT NULL,
	`sha` text NOT NULL,
	`message` text NOT NULL,
	`time` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`build_id`) REFERENCES `atlas_builds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `atlas_commits_build_idx` ON `atlas_commits` (`build_id`);--> statement-breakpoint
CREATE TABLE `atlas_downloads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`build_id` integer NOT NULL,
	`name` text NOT NULL,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`build_id`) REFERENCES `atlas_builds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `atlas_downloads_build_idx` ON `atlas_downloads` (`build_id`);--> statement-breakpoint
CREATE TABLE `atlas_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`key` text NOT NULL,
	`support_status` text DEFAULT 'SUPPORTED' NOT NULL,
	`java_min_version` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `atlas_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "atlas_versions_support_status_check" CHECK("atlas_versions"."support_status" in ('SUPPORTED', 'DEPRECATED', 'UNSUPPORTED'))
);
--> statement-breakpoint
CREATE INDEX `atlas_versions_project_key_idx` ON `atlas_versions` (`project_id`,`key`);