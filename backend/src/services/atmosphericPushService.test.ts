import { describe, expect, it } from 'vitest';
import { buildGlobalSkyToday } from './globalSkyService';
import { buildAtmosphericPushCopy, isInsideQuietHours } from './atmosphericPushService';

describe('atmospheric push copy', () => {
  it('uses atmosphere-driven language instead of generic horoscope-ready copy', () => {
    const copy = buildAtmosphericPushCopy(buildGlobalSkyToday('2026-05-25'));

    expect(copy.title).not.toMatch(/horoscope is ready/i);
    expect(copy.body).not.toMatch(/hurry|limited|streak|don't miss/i);
  });

  it('respects quiet-hour windows including overnight ranges', () => {
    expect(isInsideQuietHours('22:30', { enabled: true, start: '22:00', end: '07:00' })).toBe(true);
    expect(isInsideQuietHours('06:30', { enabled: true, start: '22:00', end: '07:00' })).toBe(true);
    expect(isInsideQuietHours('12:30', { enabled: true, start: '22:00', end: '07:00' })).toBe(false);
    expect(isInsideQuietHours('22:30', { enabled: false, start: '22:00', end: '07:00' })).toBe(false);
  });
});
