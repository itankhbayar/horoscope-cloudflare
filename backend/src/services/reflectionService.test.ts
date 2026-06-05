import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import { getDb, type DB } from '../db/client';
import {
  getReflection,
  getReflectionState,
  isResonance,
  previousDateISO,
  submitReflection,
} from './reflectionService';

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

function createSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE daily_reflections (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      reading_date TEXT NOT NULL,
      resonance INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX daily_reflections_user_date_idx ON daily_reflections(user_id, reading_date);

    CREATE TABLE daily_ritual_history (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      ritual_date TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX daily_ritual_history_user_date_idx ON daily_ritual_history(user_id, ritual_date);
  `);
}

const USER = 'user-1';
const TODAY = '2026-06-04';
const YESTERDAY = '2026-06-03';

function revealReading(sqlite: DatabaseSync, userId: string, date: string): void {
  sqlite
    .prepare('INSERT INTO daily_ritual_history (id, user_id, ritual_date) VALUES (?, ?, ?)')
    .run(crypto.randomUUID(), userId, date);
}

describe('reflectionService', () => {
  let sqlite: DatabaseSync;
  let db: DB;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    createSchema(sqlite);
    db = getDb(createSqliteD1(sqlite));
  });

  afterEach(() => {
    sqlite.close();
  });

  describe('pure helpers', () => {
    it('isResonance accepts only 1, 2, 3', () => {
      expect(isResonance(1)).toBe(true);
      expect(isResonance(3)).toBe(true);
      expect(isResonance(0)).toBe(false);
      expect(isResonance(4)).toBe(false);
      expect(isResonance('2')).toBe(false);
      expect(isResonance(undefined)).toBe(false);
    });

    it('previousDateISO steps back one calendar day across a month boundary', () => {
      expect(previousDateISO('2026-06-01')).toBe('2026-05-31');
      expect(previousDateISO(TODAY)).toBe(YESTERDAY);
    });
  });

  it('submits a new reflection (alreadyExisted false) and reads it back', async () => {
    const result = await submitReflection(db, USER, TODAY, 2);
    expect(result).toEqual({ readingDate: TODAY, resonance: 2, alreadyExisted: false });
    expect(await getReflection(db, USER, TODAY)).toEqual({ readingDate: TODAY, resonance: 2 });
  });

  it('is idempotent on (userId, readingDate): overwrite updates resonance and flags alreadyExisted', async () => {
    await submitReflection(db, USER, TODAY, 1);
    const second = await submitReflection(db, USER, TODAY, 3);
    expect(second.alreadyExisted).toBe(true);
    expect(await getReflection(db, USER, TODAY)).toEqual({ readingDate: TODAY, resonance: 3 });
    const rows = sqlite.prepare('SELECT COUNT(*) AS c FROM daily_reflections').get() as { c: number };
    expect(rows.c).toBe(1);
  });

  it('keeps reflections scoped per user', async () => {
    await submitReflection(db, USER, TODAY, 3);
    expect(await getReflection(db, 'user-2', TODAY)).toBeNull();
  });

  describe('getReflectionState checkInPending truth table', () => {
    it('not revealed, not reflected → not pending', async () => {
      const state = await getReflectionState(db, USER, TODAY);
      expect(state).toEqual({ todayCheckIn: null, yesterday: null, checkInPending: false });
    });

    it('revealed, not reflected → pending', async () => {
      revealReading(sqlite, USER, TODAY);
      const state = await getReflectionState(db, USER, TODAY);
      expect(state.checkInPending).toBe(true);
      expect(state.todayCheckIn).toBeNull();
    });

    it('revealed and reflected → not pending, returns todayCheckIn', async () => {
      revealReading(sqlite, USER, TODAY);
      await submitReflection(db, USER, TODAY, 2);
      const state = await getReflectionState(db, USER, TODAY);
      expect(state.checkInPending).toBe(false);
      expect(state.todayCheckIn).toEqual({ readingDate: TODAY, resonance: 2 });
    });

    it('surfaces yesterday for the morning acknowledgment', async () => {
      await submitReflection(db, USER, YESTERDAY, 1);
      const state = await getReflectionState(db, USER, TODAY);
      expect(state.yesterday).toEqual({ readingDate: YESTERDAY, resonance: 1 });
    });
  });
});
