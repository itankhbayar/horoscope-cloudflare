import { describe, expect, it, vi, afterEach } from 'vitest';

describe('billing platform routing', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('selects RevenueCat on iOS', async () => {
    vi.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    const { usesRevenueCatBilling, usesStripeBilling } = await import('./platform');
    expect(usesRevenueCatBilling()).toBe(true);
    expect(usesStripeBilling()).toBe(false);
  });

  it('selects Stripe on Android', async () => {
    vi.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    const { usesRevenueCatBilling, usesStripeBilling } = await import('./platform');
    expect(usesRevenueCatBilling()).toBe(false);
    expect(usesStripeBilling()).toBe(true);
  });
});
