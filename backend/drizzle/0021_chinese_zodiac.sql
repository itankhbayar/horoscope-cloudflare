CREATE TABLE IF NOT EXISTS `chinese_daily_horoscopes` (
	`id` text PRIMARY KEY NOT NULL,
	`animal` text NOT NULL,
	`date` text NOT NULL,
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
CREATE UNIQUE INDEX IF NOT EXISTS `chinese_daily_horoscopes_animal_date_lang_idx` ON `chinese_daily_horoscopes` (`animal`,`date`,`lang`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chinese_daily_horoscopes_date_idx` ON `chinese_daily_horoscopes` (`date`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chinese_period_horoscopes` (
	`id` text PRIMARY KEY NOT NULL,
	`animal` text NOT NULL,
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
CREATE UNIQUE INDEX IF NOT EXISTS `chinese_period_horoscopes_animal_type_key_lang_idx` ON `chinese_period_horoscopes` (`animal`,`period_type`,`period_key`,`lang`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chinese_period_horoscopes_type_key_idx` ON `chinese_period_horoscopes` (`period_type`,`period_key`);
