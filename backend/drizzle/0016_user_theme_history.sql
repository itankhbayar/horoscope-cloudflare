CREATE TABLE IF NOT EXISTS user_theme_history (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  theme_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_theme_history_user_date_idx
  ON user_theme_history(user_id, theme_date);

CREATE INDEX IF NOT EXISTS user_theme_history_user_date_lookup_idx
  ON user_theme_history(user_id, theme_date);
