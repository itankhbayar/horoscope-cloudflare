import { describe, expect, it } from 'vitest';
import { nextDailyStreak } from './streaks';

describe('daily streaks', () => {
  it('starts a streak on first check-in', () => {
    expect(nextDailyStreak({ count: 0, lastCheckInDate: null }, '2026-05-23')).toEqual({
      count: 1,
      lastCheckInDate: '2026-05-23',
    });
  });

  it('increments only on consecutive days', () => {
    expect(nextDailyStreak({ count: 2, lastCheckInDate: '2026-05-22' }, '2026-05-23')).toEqual({
      count: 3,
      lastCheckInDate: '2026-05-23',
    });
  });

  it('does not inflate from repeat opens on the same day', () => {
    expect(nextDailyStreak({ count: 4, lastCheckInDate: '2026-05-23' }, '2026-05-23')).toEqual({
      count: 4,
      lastCheckInDate: '2026-05-23',
    });
  });

  it('resets after a missed day without shame copy', () => {
    expect(nextDailyStreak({ count: 4, lastCheckInDate: '2026-05-20' }, '2026-05-23')).toEqual({
      count: 1,
      lastCheckInDate: '2026-05-23',
    });
  });
});
