CREATE TABLE `tarot_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`timezone` text NOT NULL,
	`sign` text NOT NULL,
	`payload_json` text NOT NULL,
	`energy_score` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tarot_daily_date_tz_sign_idx` ON `tarot_daily` (`date`,`timezone`,`sign`);--> statement-breakpoint
CREATE INDEX `tarot_daily_date_idx` ON `tarot_daily` (`date`);