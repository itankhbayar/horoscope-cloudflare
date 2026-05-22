import { describe, expect, it } from 'vitest';
import {
  entitlementIsActive,
  hasActivePremiumFromEntitlements,
  resolvePremiumFromWebhookEvent,
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
  verifyRevenueCatWebhookAuthorization,
} from './revenueCatService';

describe('verifyRevenueCatWebhookAuthorization', () => {
  it('accepts bearer token matching secret', () => {
    expect(verifyRevenueCatWebhookAuthorization('Bearer secret-1', 'secret-1')).toBe(true);
    expect(verifyRevenueCatWebhookAuthorization('secret-1', 'secret-1')).toBe(true);
  });

  it('rejects missing or wrong authorization', () => {
    expect(verifyRevenueCatWebhookAuthorization(undefined, 'secret-1')).toBe(false);
    expect(verifyRevenueCatWebhookAuthorization('Bearer other', 'secret-1')).toBe(false);
  });
});

describe('entitlementIsActive', () => {
  it('treats null expires_date as active', () => {
    expect(entitlementIsActive({ expires_date: null })).toBe(true);
  });

  it('rejects expired entitlements', () => {
    expect(
      entitlementIsActive({
        expires_date: '2020-01-01T00:00:00Z',
      }),
    ).toBe(false);
  });
});

describe('hasActivePremiumFromEntitlements', () => {
  it('detects premium entitlement by id', () => {
    expect(
      hasActivePremiumFromEntitlements({
        [REVENUECAT_PREMIUM_ENTITLEMENT_ID]: { expires_date: null },
      }),
    ).toBe(true);
    expect(
      hasActivePremiumFromEntitlements({
        other: { expires_date: null },
      }),
    ).toBe(false);
  });
});

describe('resolvePremiumFromWebhookEvent', () => {
  it('grants on purchase lifecycle events', () => {
    expect(resolvePremiumFromWebhookEvent({ type: 'INITIAL_PURCHASE' })).toBe(true);
    expect(resolvePremiumFromWebhookEvent({ type: 'RENEWAL' })).toBe(true);
  });

  it('revokes on expiration', () => {
    expect(resolvePremiumFromWebhookEvent({ type: 'EXPIRATION' })).toBe(false);
  });

  it('defers cancellation to expiration', () => {
    expect(resolvePremiumFromWebhookEvent({ type: 'CANCELLATION' })).toBeNull();
  });
});
