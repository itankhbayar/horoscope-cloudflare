import { describe, expect, it } from 'vitest';
import { entitlementIsActive, hasPremiumEntitlement, isPremiumEntitlementInTrial } from './entitlements';

function customerInfoWith(periodType: string, expirationDateMillis: number | null = null) {
  return {
    entitlements: {
      active: { premium: { isActive: true, expirationDateMillis, periodType } },
      all: {},
    },
  } as never;
}

describe('entitlementIsActive', () => {
  it('returns false when entitlement is missing', () => {
    expect(entitlementIsActive(undefined)).toBe(false);
  });

  it('returns true for active entitlement without expiration', () => {
    expect(
      entitlementIsActive({
        isActive: true,
        expirationDateMillis: null,
      } as never),
    ).toBe(true);
  });

  it('returns false when expiration is in the past', () => {
    expect(
      entitlementIsActive({
        isActive: true,
        expirationDateMillis: Date.now() - 60_000,
      } as never),
    ).toBe(false);
  });
});

describe('hasPremiumEntitlement', () => {
  it('reads premium from customerInfo.active map', () => {
    expect(
      hasPremiumEntitlement({
        entitlements: {
          active: {
            premium: {
              isActive: true,
              expirationDateMillis: null,
            },
          },
          all: {},
        },
      } as never),
    ).toBe(true);
  });

  it('grants premium for an active TRIAL entitlement (purchase or restore)', () => {
    expect(hasPremiumEntitlement(customerInfoWith('TRIAL'))).toBe(true);
    expect(hasPremiumEntitlement(customerInfoWith('NORMAL'))).toBe(true);
  });
});

describe('isPremiumEntitlementInTrial', () => {
  it('is true only when the active premium entitlement is in its TRIAL period', () => {
    expect(isPremiumEntitlementInTrial(customerInfoWith('TRIAL'))).toBe(true);
  });

  it('is false for a normal paid entitlement', () => {
    expect(isPremiumEntitlementInTrial(customerInfoWith('NORMAL'))).toBe(false);
  });

  it('is false when there is no active premium entitlement', () => {
    expect(isPremiumEntitlementInTrial(null)).toBe(false);
    expect(isPremiumEntitlementInTrial(customerInfoWith('TRIAL', Date.now() - 60_000))).toBe(false);
  });
});
