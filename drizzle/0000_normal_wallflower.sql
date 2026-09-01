CREATE TABLE `bookmarks` (
	`device_key` text NOT NULL,
	`notice_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`device_key`, `notice_id`),
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_bookmarks_device` ON `bookmarks` (`device_key`);--> statement-breakpoint
CREATE TABLE `institutions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`group` text NOT NULL,
	`official_domain` text,
	`parent_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_institutions_group` ON `institutions` (`group`);--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`external_id` text NOT NULL,
	`institution` text NOT NULL,
	`group` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`category` text NOT NULL,
	`audience` text NOT NULL,
	`region` text,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`application_url` text,
	`opens_at` integer,
	`closes_at` integer,
	`deadline_label` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`content_hash` text NOT NULL,
	`verified_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notices_source_external` ON `notices` (`source_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `idx_notices_status_closes` ON `notices` (`status`,`closes_at`);--> statement-breakpoint
CREATE INDEX `idx_notices_group_category` ON `notices` (`group`,`category`);--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`notice_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`changed_fields` text NOT NULL,
	`discovered_at` integer NOT NULL,
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_revisions_notice_discovered` ON `revisions` (`notice_id`,`discovered_at`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`method` text NOT NULL,
	`cadence_minutes` integer NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`last_success_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sources_url` ON `sources` (`url`);--> statement-breakpoint
CREATE INDEX `idx_sources_status` ON `sources` (`status`);
--> statement-breakpoint
PRAGMA optimize;
