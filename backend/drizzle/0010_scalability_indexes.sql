-- Hot-path lookup for refresh rotation and cleanup.
CREATE INDEX IF NOT EXISTS `refresh_sessions_expires_at_idx` ON `refresh_sessions` (`expires_at`);

-- Webhook processing retries scan status/claimed_at; cleanup scans processed_at.
CREATE INDEX IF NOT EXISTS `stripe_webhook_events_status_claimed_idx` ON `stripe_webhook_events` (`status`, `claimed_at`);
CREATE INDEX IF NOT EXISTS `stripe_webhook_events_processed_at_idx` ON `stripe_webhook_events` (`processed_at`);

-- Stripe reconciliation and premium checks resolve users by payment processor identifiers.
CREATE INDEX IF NOT EXISTS `users_stripe_customer_id_idx` ON `users` (`stripe_customer_id`);
CREATE INDEX IF NOT EXISTS `users_stripe_subscription_id_idx` ON `users` (`stripe_subscription_id`);
CREATE INDEX IF NOT EXISTS `users_is_premium_idx` ON `users` (`is_premium`);

-- Explicit notification user index for list/delete paths; primary key already covers preferences.
CREATE INDEX IF NOT EXISTS `notification_preferences_user_id_idx` ON `notification_preferences` (`user_id`);

-- Cache cleanup jobs delete by date while public reads use existing composite unique indexes.
CREATE INDEX IF NOT EXISTS `daily_horoscopes_date_idx` ON `daily_horoscopes` (`date`);
CREATE INDEX IF NOT EXISTS `tarot_daily_date_idx` ON `tarot_daily` (`date`);
