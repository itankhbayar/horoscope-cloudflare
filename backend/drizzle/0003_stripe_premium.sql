ALTER TABLE `users` ADD `is_premium` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `stripe_webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`received_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
