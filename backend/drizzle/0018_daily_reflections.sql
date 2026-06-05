CREATE TABLE IF NOT EXISTS daily_reflections (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reading_date TEXT NOT NULL,
  resonance INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_reflections_user_date_idx
  ON daily_reflections(user_id, reading_date);

CREATE INDEX IF NOT EXISTS daily_reflections_user_date_lookup_idx
  ON daily_reflections(user_id, reading_date);
