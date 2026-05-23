import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import { getDb } from '../db/client';
import { cleanupOperationalData } from './cleanupService';

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
  `);
}

function count(db: DatabaseSync, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}

describe('cleanupOperationalData', () => {
  let sqlite: DatabaseSync;

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-05-22T00:00:00.000Z'));
    sqlite = new DatabaseSync(':memory:');
    createSchema(sqlite);
  });

  afterEach(() => {
    sqlite.close();
    vi.useRealTimers();
  });

  it('deletes expired operational rows in chunks and is idempotent', async () => {
    sqlite
      .prepare(
        'INSERT INTO refresh_sessions (id, user_id, token_hash, family_id, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('expired-1', 'user-1', 'hash-1', 'fam-1', '2026-05-01T00:00:00.000Z', null);
    sqlite
      .prepare(
        'INSERT INTO refresh_sessions (id, user_id, token_hash, family_id, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('revoked-1', 'user-1', 'hash-2', 'fam-1', '2026-06-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z');
    sqlite
      .prepare(
        'INSERT INTO refresh_sessions (id, user_id, token_hash, family_id, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('active-1', 'user-1', 'hash-3', 'fam-1', '2026-06-01T00:00:00.000Z', null);
    sqlite
      .prepare(
        'INSERT INTO stripe_webhook_events (event_id, event_type, processed_at, status) VALUES (?, ?, ?, ?)',
      )
      .run('evt_old', 'checkout.session.completed', '2026-04-01T00:00:00.000Z', 'processed');
    sqlite
      .prepare(
        'INSERT INTO daily_horoscopes (id, sign, date, lang, overall, love, career, health, lucky_number, lucky_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run('daily-old', 'aries', '2026-01-01', 'en', 'o', 'l', 'c', 'h', 1, 'blue');
    sqlite
      .prepare(
        'INSERT INTO tarot_daily (id, date, timezone, sign, payload_json, energy_score) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('tarot-old', '2026-03-01', 'UTC', 'aries', '{}', 50);

    const result = await cleanupOperationalData(getDb(createSqliteD1(sqlite)), { APP_ENV: 'test' }, 1);
    const again = await cleanupOperationalData(getDb(createSqliteD1(sqlite)), { APP_ENV: 'test' }, 1);

    expect(result.deleted).toBe(5);
    expect(result.jobs.some((job) => job.chunks > 0)).toBe(true);
    expect(again.deleted).toBe(0);
    expect(count(sqlite, 'refresh_sessions')).toBe(1);
    expect(count(sqlite, 'stripe_webhook_events')).toBe(0);
    expect(count(sqlite, 'daily_horoscopes')).toBe(0);
    expect(count(sqlite, 'tarot_daily')).toBe(0);
  });

  it('preserves recent sessions, pending webhooks, and fresh cache rows', async () => {
    sqlite
      .prepare(
        'INSERT INTO refresh_sessions (id, user_id, token_hash, family_id, expires_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run('recent-expired', 'user-1', 'hash-1', 'fam-1', '2026-05-20T00:00:00.000Z');
    sqlite
      .prepare(
        'INSERT INTO stripe_webhook_events (event_id, event_type, status) VALUES (?, ?, ?)',
      )
      .run('evt_processing', 'checkout.session.completed', 'processing');
    sqlite
      .prepare(
        'INSERT INTO daily_horoscopes (id, sign, date, lang, overall, love, career, health, lucky_number, lucky_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run('daily-fresh', 'aries', '2026-05-21', 'en', 'o', 'l', 'c', 'h', 1, 'blue');

    const result = await cleanupOperationalData(getDb(createSqliteD1(sqlite)), { APP_ENV: 'test' }, 10);

    expect(result.deleted).toBe(0);
    expect(count(sqlite, 'refresh_sessions')).toBe(1);
    expect(count(sqlite, 'stripe_webhook_events')).toBe(1);
    expect(count(sqlite, 'daily_horoscopes')).toBe(1);
  });
});
