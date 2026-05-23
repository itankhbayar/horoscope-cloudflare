CREATE TABLE `refresh_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `token_hash` text NOT NULL,
  `family_id` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `revoked_at` text,
  `replaced_by` text,
  `last_used_at` text,
  `user_agent` text,
  `ip_address` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_sessions_token_hash_idx` ON `refresh_sessions` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `refresh_sessions_user_idx` ON `refresh_sessions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `refresh_sessions_family_idx` ON `refresh_sessions` (`family_id`);
