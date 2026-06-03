import { describe, expect, it } from 'vitest';
import { freezesAfterUse, isStreakAtRisk, shiftDateISO } from './streakFreeze';

describe('shiftDateISO', () => {
  it('moves a date backwards across a month boundary', () => {
    expect(shiftDateISO('2026-06-01', -2)).toBe('2026-05-30');
  });

  it('moves a date forwards', () => {
    expect(shiftDateISO('2026-06-01', 1)).toBe('2026-06-02');
  });

  it('returns the input untouched when it cannot be parsed', () => {
    expect(shiftDateISO('not-a-date', -2)).toBe('not-a-date');
  });
});

describe('isStreakAtRisk', () => {
  const today = '2026-06-03';

  it('flags a streak when exactly yesterday was missed and a freeze is held', () => {
    expect(
      isStreakAtRisk({ streakCount: 9, streakFreezes: 2, streakLastDate: '2026-06-01' }, today),
    ).toBe(true);
  });

  it('does not flag when the streak is already counted today', () => {
    expect(
      isStreakAtRisk({ streakCount: 9, streakFreezes: 2, streakLastDate: today }, today),
    ).toBe(false);
  });

  it('does not flag when yesterday was completed (no gap yet)', () => {
    expect(
      isStreakAtRisk({ streakCount: 9, streakFreezes: 2, streakLastDate: '2026-06-02' }, today),
    ).toBe(false);
  });

  it('does not flag an unrecoverable gap of two or more missed days', () => {
    expect(
      isStreakAtRisk({ streakCount: 9, streakFreezes: 2, streakLastDate: '2026-05-31' }, today),
    ).toBe(false);
  });

  it('does not flag when no freezes remain', () => {
    expect(
      isStreakAtRisk({ streakCount: 9, streakFreezes: 0, streakLastDate: '2026-06-01' }, today),
    ).toBe(false);
  });

  it('does not flag when there is no active streak', () => {
    expect(
      isStreakAtRisk({ streakCount: 0, streakFreezes: 2, streakLastDate: '2026-06-01' }, today),
    ).toBe(false);
  });

  it('treats missing or partial fields as not at risk', () => {
    expect(isStreakAtRisk({}, today)).toBe(false);
    expect(isStreakAtRisk({ streakCount: 5, streakFreezes: 1, streakLastDate: null }, today)).toBe(false);
  });
});

describe('freezesAfterUse', () => {
  it('subtracts one from the inventory', () => {
    expect(freezesAfterUse(3)).toBe(2);
  });

  it('never drops below zero', () => {
    expect(freezesAfterUse(0)).toBe(0);
    expect(freezesAfterUse(null)).toBe(0);
    expect(freezesAfterUse(undefined)).toBe(0);
  });
});
