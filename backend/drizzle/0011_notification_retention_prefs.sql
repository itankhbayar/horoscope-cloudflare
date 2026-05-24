ALTER TABLE notification_preferences ADD COLUMN daily_reminder_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN streak_reminder_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN re_engagement_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN quiet_hours_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notification_preferences ADD COLUMN quiet_hours_start TEXT NOT NULL DEFAULT '21:00';
ALTER TABLE notification_preferences ADD COLUMN quiet_hours_end TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE notification_preferences ADD COLUMN reminder_hour_local INTEGER NOT NULL DEFAULT 9;
