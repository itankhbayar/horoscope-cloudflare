CREATE TABLE IF NOT EXISTS notification_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  dedupe_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_for TEXT NOT NULL,
  last_error TEXT,
  receipts TEXT,
  receipts_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  sent_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_jobs_dedupe_key_idx
  ON notification_jobs(dedupe_key);

CREATE INDEX IF NOT EXISTS notification_jobs_status_scheduled_idx
  ON notification_jobs(status, scheduled_for);

CREATE INDEX IF NOT EXISTS notification_jobs_user_idx
  ON notification_jobs(user_id);

CREATE INDEX IF NOT EXISTS notification_jobs_receipts_pending_idx
  ON notification_jobs(status, receipts_checked_at);
