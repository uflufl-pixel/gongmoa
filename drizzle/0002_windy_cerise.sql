CREATE TABLE `notice_reviews` (
	`notice_id` text PRIMARY KEY NOT NULL,
	`decision` text NOT NULL,
	`note` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notice_reviews_decision` ON `notice_reviews` (`decision`);
--> statement-breakpoint
PRAGMA optimize;
