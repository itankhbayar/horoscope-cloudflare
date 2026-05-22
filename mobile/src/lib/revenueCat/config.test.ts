import { afterEach, describe, expect, it, vi } from 'vitest';

describe('isRevenueCatConfigured', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('returns false when iOS API key is missing', async () => {
    vi.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    vi.stubGlobal('process', { env: {} });
    const { isRevenueCatConfigured, readRevenueCatApiKey } = await import('./config');
    expect(readRevenueCatApiKey()).toBe('');
    expect(isRevenueCatConfigured()).toBe(false);
  });

  it('returns true when iOS API key is set', async () => {
    vi.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    vi.stubGlobal('process', { env: { EXPO_PUBLIC_REVENUECAT_API_KEY_IOS: 'appl_test' } });
    const { isRevenueCatConfigured } = await import('./config');
    expect(isRevenueCatConfigured()).toBe(true);
  });
});
