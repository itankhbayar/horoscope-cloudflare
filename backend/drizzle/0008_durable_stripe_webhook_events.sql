CREATE TABLE `stripe_webhook_events_durable` (
	`event_id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`claimed_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`processed_at` text,
	`status` text DEFAULT 'processing' NOT NULL,
	`error` text
);
--> statement-breakpoint
INSERT INTO `stripe_webhook_events_durable` (`event_id`, `event_type`, `claimed_at`, `status`)
SELECT `id`, 'unknown', `received_at`, 'processing'
FROM `stripe_webhook_events`;
--> statement-breakpoint
DROP TABLE `stripe_webhook_events`;
--> statement-breakpoint
ALTER TABLE `stripe_webhook_events_durable` RENAME TO `stripe_webhook_events`;
