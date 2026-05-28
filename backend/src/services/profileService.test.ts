import { describe, expect, it, vi } from 'vitest';
import { getRitualHistory } from './profileService';

describe('profile ritual history', () => {
  it('returns the last 30 UTC ritual days with completion flags', async () => {
    const orderBy = vi.fn(async () => [
      { ritualDate: '2026-04-22' },
      { ritualDate: '2026-05-01' },
      { ritualDate: '2026-05-20' },
    ]);
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy })),
        })),
      })),
    };

    const history = await getRitualHistory(db as never, 'user-1', '2026-05-20');

    expect(history).toHaveLength(30);
    expect(history[0]).toEqual({ date: '2026-04-21', completed: false });
    expect(history.at(-1)).toEqual({ date: '2026-05-20', completed: true });
    expect(history.filter((day) => day.completed).map((day) => day.date)).toEqual([
      '2026-04-22',
      '2026-05-01',
      '2026-05-20',
    ]);
  });

  it('falls back to empty completion history when ritual table is missing', async () => {
    const orderBy = vi.fn(async () => {
      throw new Error('Failed query: select ritual_date from daily_ritual_history ... no such table: daily_ritual_history');
    });
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy })),
        })),
      })),
    };

    const history = await getRitualHistory(db as never, 'user-1', '2026-05-20');
    expect(history).toHaveLength(30);
    expect(history.every((day) => day.completed === false)).toBe(true);
  });
});
