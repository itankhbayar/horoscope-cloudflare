CREATE TABLE IF NOT EXISTS `chart_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`chart_hash` text NOT NULL,
	`lang` text DEFAULT 'en' NOT NULL,
	`content_json` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `chart_readings_user_chart_lang_idx` ON `chart_readings` (`user_id`,`chart_hash`,`lang`);
