import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import authRoutes from './auth';
import { hashPassword } from '../utils/password';
import { resetInMemoryRateLimits } from '../middleware/rateLimit';

type V1AuthData = {
  token: string;
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string; isPremium: boolean };
};

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/v1/auth', authRoutes);
  return app;
}

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
    CREATE TABLE users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      timezone TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_premium INTEGER NOT NULL DEFAULT 0,
      token_version INTEGER NOT NULL DEFAULT 0,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT
    );

    CREATE UNIQUE INDEX users_email_idx ON users (email);

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
      ip_address TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX refresh_sessions_token_hash_idx ON refresh_sessions (token_hash);
    CREATE INDEX refresh_sessions_user_idx ON refresh_sessions (user_id);
    CREATE INDEX refresh_sessions_family_idx ON refresh_sessions (family_id);
  `);
}

async function insertUser(db: DatabaseSync, id = 'user-1') {
  db.prepare(
    `
      INSERT INTO users (id, email, password_hash, full_name, token_version)
      VALUES (?, ?, ?, ?, 0)
    `,
  ).run(id, `${id}@example.com`, await hashPassword('secret12'), 'Test User');
}

function env(d1: D1Database) {
  return { horoscope_db: d1, JWT_SECRET: 'test-secret' } as never;
}

async function login(app: Hono, d1: D1Database, email = 'user-1@example.com'): Promise<V1AuthData> {
  const res = await app.request(
    '/api/v1/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'vitest' },
      body: JSON.stringify({ email, password: 'secret12' }),
    },
    env(d1),
  );
  expect(res.status).toBe(200);
  expect(res.headers.get('set-cookie')).toContain('HttpOnly');
  const json = (await res.json()) as { success: true; data: V1AuthData };
  return json.data;
}

async function refresh(app: Hono, d1: D1Database, refreshToken: string) {
  return app.request(
    '/api/v1/auth/refresh',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.10' },
      body: JSON.stringify({ refreshToken }),
    },
    env(d1),
  );
}

describe('v1 refresh token sessions', () => {
  let sqlite: DatabaseSync;
  let d1: D1Database;
  let app: Hono;

  beforeEach(async () => {
    resetInMemoryRateLimits();
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec('PRAGMA foreign_keys = ON');
    createSchema(sqlite);
    await insertUser(sqlite);
    d1 = createSqliteD1(sqlite);
    app = createApp();
  });

  afterEach(() => {
    resetInMemoryRateLimits();
    sqlite.close();
  });

  it('refreshes successfully and rotates the refresh token', async () => {
    const first = await login(app, d1);
    const res = await refresh(app, d1, first.refreshToken);

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: true; data: V1AuthData };
    expect(json.data.accessToken).toEqual(expect.any(String));
    expect(json.data.refreshToken).not.toBe(first.refreshToken);

    const oldRow = sqlite
      .prepare('SELECT revoked_at, replaced_by, last_used_at FROM refresh_sessions ORDER BY created_at LIMIT 1')
      .get() as { revoked_at: string | null; replaced_by: string | null; last_used_at: string | null };
    expect(oldRow.revoked_at).toEqual(expect.any(String));
    expect(oldRow.replaced_by).toEqual(expect.any(String));
    expect(oldRow.last_used_at).toEqual(expect.any(String));
  });

  it('detects refresh token reuse and invalidates the whole family', async () => {
    const first = await login(app, d1);
    const rotated = await refresh(app, d1, first.refreshToken);
    expect(rotated.status).toBe(200);

    const reused = await refresh(app, d1, first.refreshToken);
    expect(reused.status).toBe(401);

    const user = sqlite.prepare('SELECT token_version FROM users WHERE id = ?').get('user-1') as {
      token_version: number;
    };
    expect(user.token_version).toBe(1);

    const active = sqlite.prepare('SELECT COUNT(*) AS count FROM refresh_sessions WHERE revoked_at IS NULL').get() as {
      count: number;
    };
    expect(active.count).toBe(0);
  });

  it('rejects a revoked refresh token', async () => {
    const first = await login(app, d1);
    await app.request(
      '/api/v1/auth/logout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: first.refreshToken }),
      },
      env(d1),
    );

    const res = await refresh(app, d1, first.refreshToken);
    expect(res.status).toBe(401);
  });

  it('rejects access tokens after tokenVersion invalidation', async () => {
    const first = await login(app, d1);
    sqlite.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run('user-1');

    const res = await app.request(
      '/api/v1/auth/me',
      { headers: { Authorization: `Bearer ${first.accessToken}` } },
      env(d1),
    );
    expect(res.status).toBe(401);
  });

  it('logout-all revokes all refresh sessions and invalidates access tokens', async () => {
    const first = await login(app, d1);
    const second = await login(app, d1);

    const logoutAll = await app.request(
      '/api/v1/auth/logout-all',
      { method: 'POST', headers: { Authorization: `Bearer ${first.accessToken}` } },
      env(d1),
    );
    expect(logoutAll.status).toBe(200);

    expect((await refresh(app, d1, first.refreshToken)).status).toBe(401);
    expect((await refresh(app, d1, second.refreshToken)).status).toBe(401);

    const me = await app.request(
      '/api/v1/auth/me',
      { headers: { Authorization: `Bearer ${first.accessToken}` } },
      env(d1),
    );
    expect(me.status).toBe(401);
  });

  it('rejects expired refresh tokens', async () => {
    const first = await login(app, d1);
    sqlite.prepare("UPDATE refresh_sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run();

    const res = await refresh(app, d1, first.refreshToken);
    expect(res.status).toBe(401);
  });

  it('rejects refresh and access tokens for deleted users', async () => {
    const first = await login(app, d1);
    sqlite.prepare('DELETE FROM users WHERE id = ?').run('user-1');

    expect((await refresh(app, d1, first.refreshToken)).status).toBe(401);
    const me = await app.request(
      '/api/v1/auth/me',
      { headers: { Authorization: `Bearer ${first.accessToken}` } },
      env(d1),
    );
    expect(me.status).toBe(401);
  });

  it('allows only one concurrent refresh attempt for the same token', async () => {
    const first = await login(app, d1);
    const results = await Promise.all([
      refresh(app, d1, first.refreshToken),
      refresh(app, d1, first.refreshToken),
    ]);

    const statuses = results.map((res) => res.status).sort();
    expect(statuses).toEqual([200, 401]);
  });
});
