CREATE TABLE IF NOT EXISTS `period_horoscopes` (
	`id` text PRIMARY KEY NOT NULL,
	`sign` text NOT NULL,
	`period_type` text NOT NULL,
	`period_key` text NOT NULL,
	`lang` text DEFAULT 'en' NOT NULL,
	`overall` text NOT NULL,
	`love` text NOT NULL,
	`career` text NOT NULL,
	`health` text NOT NULL,
	`lucky_number` integer NOT NULL,
	`lucky_color` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `period_horoscopes_sign_type_key_lang_idx` ON `period_horoscopes` (`sign`,`period_type`,`period_key`,`lang`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `period_horoscopes_type_key_idx` ON `period_horoscopes` (`period_type`,`period_key`);
