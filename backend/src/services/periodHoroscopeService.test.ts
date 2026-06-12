import { describe, expect, it } from 'vitest';
import { isoWeekKey, PERIOD_KEY_PATTERNS } from './periodHoroscopeService';

describe('isoWeekKey', () => {
  it('returns the ISO week for a mid-year date', () => {
    // 2026-06-11 is a Thursday in ISO week 24.
    expect(isoWeekKey('2026-06-11')).toBe('2026-W24');
  });

  it('keeps Monday and Sunday of the same week on one key', () => {
    expect(isoWeekKey('2026-06-08')).toBe('2026-W24'); // Monday
    expect(isoWeekKey('2026-06-14')).toBe('2026-W24'); // Sunday
    expect(isoWeekKey('2026-06-15')).toBe('2026-W25'); // next Monday
  });

  it('assigns early-January days to the previous ISO year when applicable', () => {
    // 2027-01-01 is a Friday — still part of 2026's last ISO week (W53).
    expect(isoWeekKey('2027-01-01')).toBe('2026-W53');
    expect(isoWeekKey('2027-01-04')).toBe('2027-W01'); // first Monday of 2027
  });

  it('assigns late-December days to the next ISO year when applicable', () => {
    // 2025-12-29 is a Monday — already ISO week 1 of 2026.
    expect(isoWeekKey('2025-12-29')).toBe('2026-W01');
  });

  it('zero-pads single-digit weeks', () => {
    expect(isoWeekKey('2026-01-05')).toBe('2026-W02');
  });

  it('produces keys that match the weekly route pattern', () => {
    expect(PERIOD_KEY_PATTERNS.weekly.test(isoWeekKey('2026-06-11'))).toBe(true);
    expect(PERIOD_KEY_PATTERNS.weekly.test('2026-06')).toBe(false);
    expect(PERIOD_KEY_PATTERNS.monthly.test('2026-W24')).toBe(false);
  });
});
