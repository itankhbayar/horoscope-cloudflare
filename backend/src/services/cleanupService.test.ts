import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import { getDb } from '../db/client';
import { cleanupOperationalData } from './cleanupService';
import { isoWeekKey } from './periodHoroscopeService';

function createSqliteD1(db: DatabaseSync): D1Database {
  const toD1StatementWithParams = (statement: StatementSync, params: SQLInputValue[]) => ({
    async all() {
      return { results: statement.all(...params) };
    },
    async raw() {
      return statement.all(...params).map((row) => Object.values(row as Record<string, unknown>));
    },
    async get() {
      return statement.get(...params);
    },
    async run() {
      const result = statement.run(...params);
      return { success: true, meta: { changes: result.changes } };
    },
  });

  const prepare = (sql: string) => {
    const statement = db.prepare(sql);
    return {
      bind: (...params: SQLInputValue[]) => toD1StatementWithParams(statement, params),
      async all() {
        return { results: statement.all() };
      },
      async raw() {
        return statement.all().map((row) => Object.values(row as Record<string, unknown>));
      },
      async get() {
        return statement.get();
      },
      async run() {
        const result = statement.run();
        return { success: true, meta: { changes: result.changes } };
      },
    };
  };

  return {
    prepare,
    async batch(statements: Array<ReturnType<ReturnType<typeof prepare>['bind']>>) {
      const results = [];
      for (const statement of statements) results.push(await statement.all());
      return results;
    },
    async exec(sql: string) {
      db.exec(sql);
      return { count: 0, duration: 0 };
    },
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database;
}

function createSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE refresh_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      family_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revoked_at TEXT,
      replaced_by TEXT,
      last_used_at TEXT,
      user_agent TEXT,
      ip_address TEXT
    );

    CREATE TABLE stripe_webhook_events (
      event_id TEXT PRIMARY KEY NOT NULL,
      event_type TEXT NOT NULL,
      claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT,
      status TEXT NOT NULL DEFAULT 'processing',
      error TEXT
    );

    CREATE TABLE daily_horoscopes (
      id TEXT PRIMARY KEY NOT NULL,
      sign TEXT NOT NULL,
      date TEXT NOT NULL,
      lang TEXT NOT NULL DEFAULT 'en',
      overall TEXT NOT NULL,
      love TEXT NOT NULL,
      career TEXT NOT NULL,
      health TEXT NOT NULL,
      lucky_number INTEGER NOT NULL,
      lucky_color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE tarot_daily (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      timezone TEXT NOT NULL,
      sign TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      energy_score INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE period_horoscopes (
      id TEXT PRIMARY KEY NOT NULL,
      sign TEXT NOT NULL,
      period_type TEXT NOT NULL,
      period_key TEXT NOT NULL,
      lang TEXT NOT NULL DEFAULT 'en',
      overall TEXT NOT NULL,
      love TEXT NOT NULL,
      career TEXT NOT NULL,
      health TEXT NOT NULL,
      lucky_number INTEGER NOT NULL,
      lucky_color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE notification_jobs (
      id TEXT PRIMARY KEY NOT NULL,
      dedupe_key TEXT NOT NULL,
      kind TEXT NOT NULL,
      user_id TEXT NOT NULL,
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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_at TEXT
    );
  `);
}

function count(db: DatabaseSync, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}

// The cleanup SQL filters with SQLite's datetime('now', '-N days'), which reads the real
// system clock in node:sqlite (vitest fake timers don't reach it). Compute fixture timestamps
// from the same clock so they stay on the intended side of each retention window regardless of
// the actual wall-clock time.
function relativeDateTime(db: DatabaseSync, modifier: string): string {
  return (db.prepare(`SELECT datetime('now', ?) AS value`).get(modifier) as { value: string }).value;
}

function relativeDate(db: DatabaseSync, modifier: string): string {
  return (db.prepare(`SELECT date('now', ?) AS value`).get(modifier) as { value: string }).value;
}

describe('cleanupOperationalData', () => {
  let sqlite: DatabaseSync;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    createSchema(sqlite);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('deletes expired operational rows in chunks and is idempotent', async () => {
    sqlite
      .prepare(
        'INSERT INTO refresh_sessions (id, user_id, token_hash, family_id, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('expired-1', 'user-1', 'hash-1', 'fam-1', relativeDateTime(sqlite, '-21 days'), null);
    sqlite
      .prepare(
        'INSERT INTO refresh_sessions (id, user_id, token_hash, family_id, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('revoked-1', 'user-1', 'hash-2', 'fam-1', relativeDateTime(sqlite, '+10 days'), relativeDateTime(sqlite, '-40 days'));
    sqlite
      .prepare(
        'INSERT INTO refresh_sessions (id, user_id, token_hash, family_id, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('active-1', 'user-1', 'hash-3', 'fam-1', relativeDateTime(sqlite, '+10 days'), null);
    sqlite
      .prepare(
        'INSERT INTO stripe_webhook_events (event_id, event_type, processed_at, status) VALUES (?, ?, ?, ?)',
      )
      .run('evt_old', 'checkout.session.completed', relativeDateTime(sqlite, '-40 days'), 'processed');
    const today = relativeDate(sqlite, '+0 days');
    sqlite
      .prepare(
        'INSERT INTO daily_horoscopes (id, sign, date, lang, overall, love, career, health, lucky_number, lucky_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run('daily-old', 'aries', relativeDate(sqlite, '-1 days'), 'en', 'o', 'l', 'c', 'h', 1, 'blue');
    sqlite
      .prepare(
        'INSERT INTO daily_horoscopes (id, sign, date, lang, overall, love, career, health, lucky_number, lucky_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run('daily-today', 'aries', today, 'en', 'o', 'l', 'c', 'h', 1, 'blue');
    const insertPeriod = sqlite.prepare(
      'INSERT INTO period_horoscopes (id, sign, period_type, period_key, lang, overall, love, career, health, lucky_number, lucky_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    // Old keys (purged) and the current keys for today (retained).
    insertPeriod.run('week-old', 'aries', 'weekly', '2000-W01', 'en', 'o', 'l', 'c', 'h', 1, 'blue');
    insertPeriod.run('month-old', 'aries', 'monthly', '2000-01', 'en', 'o', 'l', 'c', 'h', 1, 'blue');
    insertPeriod.run('year-old', 'aries', 'yearly', '2000', 'en', 'o', 'l', 'c', 'h', 1, 'blue');
    insertPeriod.run('week-now', 'aries', 'weekly', isoWeekKey(today), 'en', 'o', 'l', 'c', 'h', 1, 'blue');
    insertPeriod.run('month-now', 'aries', 'monthly', today.slice(0, 7), 'en', 'o', 'l', 'c', 'h', 1, 'blue');
    insertPeriod.run('year-now', 'aries', 'yearly', today.slice(0, 4), 'en', 'o', 'l', 'c', 'h', 1, 'blue');
    sqlite
      .prepare(
        'INSERT INTO tarot_daily (id, date, timezone, sign, payload_json, energy_score) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('tarot-old', relativeDate(sqlite, '-60 days'), 'UTC', 'aries', '{}', 50);
    sqlite
      .prepare(
        'INSERT INTO notification_jobs (id, dedupe_key, kind, user_id, local_date, title, body, status, scheduled_for, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run('job-old', 'd1', 'daily_horoscope', 'user-1', relativeDate(sqlite, '-20 days'), 't', 'b', 'sent', relativeDateTime(sqlite, '-20 days'), relativeDateTime(sqlite, '-20 days'));

    const result = await cleanupOperationalData(getDb(createSqliteD1(sqlite)), { APP_ENV: 'test' }, 1, today);
    const again = await cleanupOperationalData(getDb(createSqliteD1(sqlite)), { APP_ENV: 'test' }, 1, today);

    expect(result.deleted).toBe(9);
    expect(result.jobs.some((job) => job.chunks > 0)).toBe(true);
    expect(again.deleted).toBe(0);
    expect(count(sqlite, 'refresh_sessions')).toBe(1);
    expect(count(sqlite, 'stripe_webhook_events')).toBe(0);
    // Only today's daily reading and the current week/month/year periods remain.
    expect(count(sqlite, 'daily_horoscopes')).toBe(1);
    expect(count(sqlite, 'period_horoscopes')).toBe(3);
    expect(count(sqlite, 'tarot_daily')).toBe(0);
    expect(count(sqlite, 'notification_jobs')).toBe(0);
  });

  it('preserves recent sessions, pending webhooks, and fresh cache rows', async () => {
    sqlite
      .prepare(
        'INSERT INTO refresh_sessions (id, user_id, token_hash, family_id, expires_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run('recent-expired', 'user-1', 'hash-1', 'fam-1', relativeDateTime(sqlite, '-2 days'));
    sqlite
      .prepare(
        'INSERT INTO stripe_webhook_events (event_id, event_type, status) VALUES (?, ?, ?)',
      )
      .run('evt_processing', 'checkout.session.completed', 'processing');
    sqlite
      .prepare(
        'INSERT INTO daily_horoscopes (id, sign, date, lang, overall, love, career, health, lucky_number, lucky_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run('daily-fresh', 'aries', relativeDate(sqlite, '+0 days'), 'en', 'o', 'l', 'c', 'h', 1, 'blue');

    const result = await cleanupOperationalData(getDb(createSqliteD1(sqlite)), { APP_ENV: 'test' }, 10);

    expect(result.deleted).toBe(0);
    expect(count(sqlite, 'refresh_sessions')).toBe(1);
    expect(count(sqlite, 'stripe_webhook_events')).toBe(1);
    expect(count(sqlite, 'daily_horoscopes')).toBe(1);
  });
});
