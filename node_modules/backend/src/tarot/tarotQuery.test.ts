import { describe, expect, it } from 'vitest';
import { isValidCalendarDate, isValidIanaTimeZone, parseTarotQueryParams } from './tarotQuery';

describe('parseTarotQueryParams', () => {
  it('returns 400 for invalid sign', () => {
    const r = parseTarotQueryParams('not-a-sign', 'UTC', undefined);
    expect(r.ok).toBe(false);
  });

  it('parses valid sign + timezone and defaults date', () => {
    const r = parseTarotQueryParams('leo', 'Asia/Ulaanbaatar', undefined);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.sign).toBe('leo');
      expect(r.timezone).toBe('Asia/Ulaanbaatar');
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('rejects bad date format', () => {
    const r = parseTarotQueryParams('leo', 'UTC', '05-01-2026');
    expect(r.ok).toBe(false);
  });

  it('accepts explicit valid date', () => {
    const r = parseTarotQueryParams('leo', 'UTC', '2026-05-01');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.date).toBe('2026-05-01');
  });
});

describe('isValidIanaTimeZone', () => {
  it('accepts UTC', () => {
    expect(isValidIanaTimeZone('UTC')).toBe(true);
  });
  it('rejects garbage', () => {
    expect(isValidIanaTimeZone('Not/A/Zone')).toBe(false);
  });
});

describe('isValidCalendarDate', () => {
  it('rejects impossible month', () => {
    expect(isValidCalendarDate('2026-13-01')).toBe(false);
  });
});
