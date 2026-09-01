CREATE TABLE `source_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`outcome` text NOT NULL,
	`status_code` integer,
	`content_hash` text,
	`content_bytes` integer,
	`keyword_hits` integer,
	`page_title` text,
	`message` text,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_source_checks_source_finished` ON `source_checks` (`source_id`,`finished_at`);--> statement-breakpoint
CREATE INDEX `idx_source_checks_outcome_finished` ON `source_checks` (`outcome`,`finished_at`);
--> statement-breakpoint
PRAGMA optimize;
