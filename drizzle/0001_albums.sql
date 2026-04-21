DROP TABLE `download_code_images`;--> statement-breakpoint
DROP TABLE `download_codes`;--> statement-breakpoint
CREATE TABLE `albums` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`drive_folder_id` text NOT NULL,
	`expires_at` text,
	`active` integer DEFAULT true NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `albums_code_unique` ON `albums` (`code`);
