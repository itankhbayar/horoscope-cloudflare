CREATE TABLE notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  all_enabled INTEGER NOT NULL DEFAULT 0,
  sale_alerts_enabled INTEGER NOT NULL DEFAULT 0,
  horoscopes_enabled INTEGER NOT NULL DEFAULT 0,
  transits_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE push_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('ios','android','web','unknown')),
  device_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX push_tokens_expo_push_token_idx ON push_tokens(expo_push_token);
CREATE INDEX push_tokens_user_id_idx ON push_tokens(user_id);
CREATE INDEX push_tokens_enabled_idx ON push_tokens(enabled);
