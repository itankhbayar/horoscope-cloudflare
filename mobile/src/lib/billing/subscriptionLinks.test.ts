import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-constants', () => ({
  default: { expoConfig: { android: { package: 'com.astralis.app' } } },
}));

import { buildPlaySubscriptionManagementUrl } from './subscriptionLinks';

describe('subscription management links', () => {
  it('builds Play subscription management URLs only with package and product ids', () => {
    expect(
      buildPlaySubscriptionManagementUrl({
        packageName: 'com.astralis.app',
        productId: 'premium.yearly',
      }),
    ).toBe('https://play.google.com/store/account/subscriptions?sku=premium.yearly&package=com.astralis.app');

    expect(buildPlaySubscriptionManagementUrl({ packageName: 'com.astralis.app', productId: null })).toBeNull();
    expect(buildPlaySubscriptionManagementUrl({ packageName: null, productId: 'premium.yearly' })).toBeNull();
  });
});
