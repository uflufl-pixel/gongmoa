CREATE TABLE `notice_details` (
	`notice_id` text PRIMARY KEY NOT NULL,
	`payload` text,
	`checked_at` integer,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notice_details_next` ON `notice_details` (`next_attempt_at`);