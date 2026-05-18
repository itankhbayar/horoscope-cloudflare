import { describe, expect, it } from 'vitest';
import { FALLBACK_TIMEZONES, getTimezoneOptions } from './timezones';

describe('getTimezoneOptions', () => {
  it('returns fallback list when supportedValuesOf is unavailable', () => {
    const original = Intl.supportedValuesOf;
    Object.defineProperty(Intl, 'supportedValuesOf', {
      configurable: true,
      value: undefined,
    });
    try {
      expect(getTimezoneOptions()).toEqual([...FALLBACK_TIMEZONES]);
    } finally {
      Object.defineProperty(Intl, 'supportedValuesOf', {
        configurable: true,
        value: original,
      });
    }
  });

  it('uses Intl.supportedValuesOf when available', () => {
    if (typeof Intl.supportedValuesOf !== 'function') {
      return;
    }
    const result = getTimezoneOptions();
    expect(result.length).toBeGreaterThan(FALLBACK_TIMEZONES.length);
  });
});
