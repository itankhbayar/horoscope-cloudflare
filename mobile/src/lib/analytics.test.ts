import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
  },
}));

import { sanitizeAnalyticsProperties, setAnalyticsConsent, track } from './analytics';

describe('mobile analytics', () => {
  beforeEach(async () => {
    storage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'test-key';
    await setAnalyticsConsent(false);
  });

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

  it('gates horoscope share events behind analytics consent', async () => {
    await track('horoscope_share_card_opened', { source: 'home', sign: 'aries', date: '2026-05-25' });

    expect(fetch).not.toHaveBeenCalled();

    await setAnalyticsConsent(true);
    await track('horoscope_share_card_opened', { source: 'home', sign: 'aries', date: '2026-05-25' });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1])).toContain('horoscope_share_card_opened');
  });
});
