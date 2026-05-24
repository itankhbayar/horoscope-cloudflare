CREATE TABLE IF NOT EXISTS daily_ritual_history (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ritual_date TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_ritual_history_user_date_idx
  ON daily_ritual_history(user_id, ritual_date);

CREATE INDEX IF NOT EXISTS daily_ritual_history_user_date_lookup_idx
  ON daily_ritual_history(user_id, ritual_date);
