import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLocalDateISO, safeDateISO, safeDateISOForDate } from './localDate';

describe('local date helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats today in UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T16:30:00.000Z'));

    expect(getLocalDateISO('UTC')).toBe('2026-05-19');
  });

  it('formats today in Asia/Ulaanbaatar', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T16:30:00.000Z'));

    expect(getLocalDateISO('Asia/Ulaanbaatar')).toBe('2026-05-20');
  });

  it('formats today in America/Los_Angeles', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T07:30:00.000Z'));

    expect(getLocalDateISO('America/Los_Angeles')).toBe('2026-05-19');
  });

  it('handles midnight rollover per timezone', () => {
    const now = new Date('2026-05-19T16:30:00.000Z');

    expect(safeDateISOForDate(now, 'Asia/Ulaanbaatar')).toBe('2026-05-20');
    expect(safeDateISOForDate(now, 'America/Los_Angeles')).toBe('2026-05-19');
  });

  it('falls back to UTC for invalid or missing timezones', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T16:30:00.000Z'));

    expect(safeDateISO('Invalid/Timezone')).toBe('2026-05-19');
    expect(safeDateISO()).toBe('2026-05-19');
  });
});
