import { afterEach, describe, expect, it, vi } from 'vitest';
import { PURCHASES_NOT_CONFIGURED_MESSAGE } from './messages';

describe('revenueCatService when not configured', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('does not call Purchases.configure without an API key', async () => {
    const configure = vi.fn();
    vi.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    vi.doMock('react-native-purchases', () => ({ default: { configure } }));
    vi.stubGlobal('process', { env: {} });

    const { configureRevenueCat, isRevenueCatReady } = await import('./revenueCatService');
    await configureRevenueCat('user-1');
    expect(configure).not.toHaveBeenCalled();
    expect(isRevenueCatReady()).toBe(false);
  });

  it('throws a friendly error from purchasePlan when not configured', async () => {
    vi.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    vi.stubGlobal('process', { env: {} });

    const { purchasePlan, RevenueCatNotConfiguredError } = await import('./revenueCatService');
    await expect(purchasePlan('monthly')).rejects.toThrow(PURCHASES_NOT_CONFIGURED_MESSAGE);
    await expect(purchasePlan('monthly')).rejects.toBeInstanceOf(RevenueCatNotConfiguredError);
  });

  it('throws a friendly error from restorePurchases when not configured', async () => {
    vi.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    vi.stubGlobal('process', { env: {} });

    const { restorePurchases } = await import('./revenueCatService');
    await expect(restorePurchases()).rejects.toThrow(PURCHASES_NOT_CONFIGURED_MESSAGE);
  });
});
