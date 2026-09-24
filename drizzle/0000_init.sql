CREATE TABLE `favorites` (
	`gallery_id` text NOT NULL,
	`image_id` text NOT NULL,
	`visitor_name` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`gallery_id`, `image_id`, `visitor_name`),
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`image_id`) REFERENCES `gallery_images`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `galleries` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`shoot_date` text,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`expires_at` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`cover_image_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `galleries_slug_unique` ON `galleries` (`slug`);--> statement-breakpoint
CREATE TABLE `gallery_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gallery_id` text NOT NULL,
	`type` text NOT NULL,
	`visitor_name` text,
	`image_id` text,
	`zip_part` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gallery_events_gallery_created_idx` ON `gallery_events` (`gallery_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `gallery_images` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`filename` text NOT NULL,
	`bytes` integer NOT NULL,
	`crc32` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`color` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gallery_images_gallery_sort_idx` ON `gallery_images` (`gallery_id`,`sort`);--> statement-breakpoint
CREATE TABLE `portfolio_images` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`color` text NOT NULL,
	`alt_de` text,
	`alt_en` text,
	`sort` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`role` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `portfolio_images_category_sort_idx` ON `portfolio_images` (`category`,`sort`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
