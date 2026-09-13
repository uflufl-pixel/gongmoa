CREATE TABLE `grant_audit_rechecks` (
	`notice_id` text PRIMARY KEY NOT NULL,
	`content_hash` text NOT NULL,
	`detail_hash` text NOT NULL,
	`checked_at` integer NOT NULL,
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE no action
);
