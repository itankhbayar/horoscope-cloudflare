DROP INDEX `daily_horoscopes_sign_date_idx`;--> statement-breakpoint
ALTER TABLE `daily_horoscopes` ADD `lang` text DEFAULT 'en' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `daily_horoscopes_sign_date_lang_idx` ON `daily_horoscopes` (`sign`,`date`,`lang`);