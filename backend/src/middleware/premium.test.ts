import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasActivePremiumEntitlement } from './premium';

describe('hasActivePremiumEntitlement', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows users with the current isPremium entitlement', () => {
    expect(hasActivePremiumEntitlement({ isPremium: true })).toBe(true);
  });

  it.each(['canceled', 'unpaid', 'incomplete', 'past_due', 'expired'])(
    'rejects %s subscription statuses',
    (status) => {
      expect(
        hasActivePremiumEntitlement({
          isPremium: true,
          subscriptionStatus: status,
        }),
      ).toBe(false);
      expect(
        hasActivePremiumEntitlement({
          isPremium: true,
          stripeSubscriptionStatus: status,
        }),
      ).toBe(false);
    },
  );

  it('allows active and trialing statuses', () => {
    expect(hasActivePremiumEntitlement({ isPremium: true, subscriptionStatus: 'active' })).toBe(
      true,
    );
    expect(
      hasActivePremiumEntitlement({ isPremium: true, stripeSubscriptionStatus: 'trialing' }),
    ).toBe(true);
  });

  it('rejects missing or expired premium state', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T00:00:00.000Z'));

    expect(hasActivePremiumEntitlement(null)).toBe(false);
    expect(hasActivePremiumEntitlement({ isPremium: false })).toBe(false);
    expect(hasActivePremiumEntitlement({ isPremium: true, premiumUntil: '2026-05-19' })).toBe(
      false,
    );
    expect(hasActivePremiumEntitlement({ isPremium: true, premiumUntil: '2026-05-21' })).toBe(
      true,
    );
  });
});
