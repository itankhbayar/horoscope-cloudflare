import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { sanitizeAnalyticsProperties } from './analytics';

describe('mobile analytics', () => {
  it('keeps analytics payloads primitive and privacy-safe by default', () => {
    expect(
      sanitizeAnalyticsProperties({
        source: 'home',
        count: 2,
        premium: false,
        nil: null,
        badObject: { birthCity: 'Ulaanbaatar' } as never,
        badArray: ['chart'] as never,
      }),
    ).toEqual({
      source: 'home',
      count: 2,
      premium: false,
      nil: null,
    });
  });
});
