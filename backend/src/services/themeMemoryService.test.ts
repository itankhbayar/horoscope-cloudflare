import { describe, expect, it, vi } from 'vitest';
import {
  buildPatternMemoryForUser,
  getRecentThemeHistory,
} from './themeMemoryService';
import type { ThemeHistoryEntry } from '../utils/patternMemory';

/** Minimal drizzle-shaped fake: `run(...)` and `select(...).from().where().all()`. */
function createFakeDb(rows: Array<{ theme: string; date: string }> = []) {
  const all = vi.fn(async () => rows);
  const run = vi.fn(async () => ({ meta: { changes: 1 } }));
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({ all })),
    })),
  }));
  return { db: { run, select } as never, run, select, all };
}

const TODAY = '2026-06-03';

describe('buildPatternMemoryForUser — premium only', () => {
  it('returns null and writes nothing for free users', async () => {
    const fake = createFakeDb([{ theme: 'recognition', date: '2026-06-02' }]);

    const result = await buildPatternMemoryForUser(fake.db, {
      userId: 'user-1',
      isPremium: false,
      todayISO: TODAY,
      theme: 'recognition',
      lang: 'en',
    });

    expect(result).toBeNull();
    expect(fake.run).not.toHaveBeenCalled();
    expect(fake.select).not.toHaveBeenCalled();
  });

  it('records the theme and returns a memory for premium users with a recurrence', async () => {
    const fake = createFakeDb([{ theme: 'recognition', date: '2026-06-02' }]);

    const result = await buildPatternMemoryForUser(fake.db, {
      userId: 'user-1',
      isPremium: true,
      todayISO: TODAY,
      theme: 'recognition',
      lang: 'en',
    });

    expect(result).toMatchObject({ theme: 'recognition', kind: 'recent', daysAgo: 1, title: 'Pattern Memory' });
    // One insert (record) + one delete (prune) before reading history.
    expect(fake.run).toHaveBeenCalledTimes(2);
    expect(fake.select).toHaveBeenCalledTimes(1);
  });

  it('still records but returns null for a premium user with no matching history', async () => {
    const fake = createFakeDb([{ theme: 'clarity', date: '2026-06-02' }]);

    const result = await buildPatternMemoryForUser(fake.db, {
      userId: 'user-1',
      isPremium: true,
      todayISO: TODAY,
      theme: 'turning',
      lang: 'en',
    });

    expect(result).toBeNull();
    expect(fake.run).toHaveBeenCalledTimes(2);
  });
});

describe('getRecentThemeHistory', () => {
  it('maps DB rows into theme history entries', async () => {
    const fake = createFakeDb([
      { theme: 'recognition', date: '2026-06-02' },
      { theme: 'turning', date: '2026-05-30' },
    ]);

    const history: ThemeHistoryEntry[] = await getRecentThemeHistory(fake.db, 'user-1', TODAY);

    expect(history).toEqual([
      { theme: 'recognition', date: '2026-06-02' },
      { theme: 'turning', date: '2026-05-30' },
    ]);
  });
});
