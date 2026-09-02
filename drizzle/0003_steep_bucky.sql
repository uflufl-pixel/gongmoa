CREATE TABLE `bojo_backfills` (
	`year` integer PRIMARY KEY NOT NULL,
	`next_page` integer DEFAULT 1 NOT NULL,
	`total_rows` integer,
	`scanned_rows` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL
);
