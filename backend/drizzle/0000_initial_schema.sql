CREATE TABLE `birth_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`birth_date` text NOT NULL,
	`birth_time` text,
	`birth_city` text NOT NULL,
	`birth_country` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`timezone_offset` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `birth_profiles_user_idx` ON `birth_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `compatibility_results` (
	`id` text PRIMARY KEY NOT NULL,
	`sign_1` text NOT NULL,
	`sign_2` text NOT NULL,
	`user_1_id` text,
	`user_2_id` text,
	`overall_score` integer NOT NULL,
	`love_score` integer NOT NULL,
	`friendship_score` integer NOT NULL,
	`communication_score` integer NOT NULL,
	`summary` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_1_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_2_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `compatibility_pair_idx` ON `compatibility_results` (`sign_1`,`sign_2`);--> statement-breakpoint
CREATE TABLE `daily_horoscopes` (
	`id` text PRIMARY KEY NOT NULL,
	`sign` text NOT NULL,
	`date` text NOT NULL,
	`overall` text NOT NULL,
	`love` text NOT NULL,
	`career` text NOT NULL,
	`health` text NOT NULL,
	`lucky_number` integer NOT NULL,
	`lucky_color` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_horoscopes_sign_date_idx` ON `daily_horoscopes` (`sign`,`date`);--> statement-breakpoint
CREATE INDEX `daily_horoscopes_date_idx` ON `daily_horoscopes` (`date`);--> statement-breakpoint
CREATE TABLE `natal_charts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`sun_sign` text NOT NULL,
	`moon_sign` text NOT NULL,
	`rising_sign` text,
	`planets` text NOT NULL,
	`houses` text NOT NULL,
	`aspects` text NOT NULL,
	`computed_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `natal_charts_user_idx` ON `natal_charts` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);