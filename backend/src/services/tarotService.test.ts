import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCachedTarotDaily } from './tarotService';
import type { ZodiacSign } from '../utils/zodiac';

/**
 * Stateful fake D1: starts empty, and an `upsert` stores a row the next `get` returns.
 * Lets us exercise the generate-on-miss path with the real deterministic generator.
 */
function createStatefulDb() {
  let stored: Record<string, unknown> | undefined;
  const insert = vi.fn(() => ({
    values: (v: Record<string, unknown>) => ({
      onConflictDoUpdate: async () => {
        stored = {
          id: v.id,
          date: v.date,
          timezone: v.timezone,
          sign: v.sign,
          payloadJson: v.payloadJson,
          energyScore: v.energyScore,
          createdAt: '2026-06-19T00:00:00.000Z',
          updatedAt: '2026-06-19T00:00:00.000Z',
        };
      },
    }),
  }));
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => stored,
        }),
      }),
    }),
    insert,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { db, insert, getStored: () => stored };
}

describe('getCachedTarotDaily generate-on-miss', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-19T10:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates and serves a reading on a cache miss for the timezone current day', async () => {
    const { db, insert } = createStatefulDb();
    const res = await getCachedTarotDaily(db, 'taurus' as ZodiacSign, 'UTC', '2026-06-19', 'mn');

    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
    if (res.status === 200) {
      expect(res.body.sign).toBe('taurus');
      expect(res.body.date).toBe('2026-06-19');
      expect(res.body.timezone).toBe('UTC');
      expect(res.body.card_of_the_day.name).toBeTruthy();
    }
  });

  it('does NOT generate for dates outside the current-day window (404, no write)', async () => {
    const { db, insert } = createStatefulDb();
    const res = await getCachedTarotDaily(db, 'taurus' as ZodiacSign, 'UTC', '2026-01-01', 'en');

    expect(res.status).toBe(404);
    expect(insert).not.toHaveBeenCalled();
  });
});
