CREATE TABLE `unlock_failures` (
	`key` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `unlock_failures_key_at_idx` ON `unlock_failures` (`key`,`at`);