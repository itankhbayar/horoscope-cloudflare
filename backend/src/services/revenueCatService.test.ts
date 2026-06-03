import { describe, expect, it } from 'vitest';
import {
  claimRevenueCatWebhookEvent,
  entitlementIsActive,
  hasActivePremiumFromEntitlements,
  processRevenueCatWebhook,
  resolvePremiumFromWebhookEvent,
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
  trialMetricForRevenueCatEvent,
  verifyRevenueCatWebhookAuthorization,
} from './revenueCatService';

/** Fake D1 modeling the webhook-event ledger (Set-backed) plus user read/update. */
function createFakeDb() {
  const claimed = new Set<string>();
  const db = {
    select: () => ({
      from: () => ({ where: () => ({ get: async () => ({ id: 'app-user-1', isPremium: false }) }) }),
    }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
    insert: () => ({
      values: (row: { eventId: string }) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (claimed.has(row.eventId)) return [];
            claimed.add(row.eventId);
            return [{ eventId: row.eventId }];
          },
        }),
      }),
    }),
  };
  return { db: db as never, claimed };
}

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

describe('trialMetricForRevenueCatEvent — Stripe-equivalent trial semantics', () => {
  it('maps a trial-period initial purchase to trial_started', () => {
    expect(trialMetricForRevenueCatEvent({ type: 'INITIAL_PURCHASE', period_type: 'TRIAL' })).toBe('trial_started');
    expect(trialMetricForRevenueCatEvent({ type: 'initial_purchase', period_type: 'trial' })).toBe('trial_started');
  });

  it('does not treat a paid initial purchase as a trial', () => {
    expect(trialMetricForRevenueCatEvent({ type: 'INITIAL_PURCHASE', period_type: 'NORMAL' })).toBeNull();
  });

  it('maps a trial-conversion renewal to trial_converted', () => {
    expect(
      trialMetricForRevenueCatEvent({ type: 'RENEWAL', is_trial_conversion: true }),
    ).toBe('trial_converted');
  });

  it('does not treat a normal renewal as a conversion', () => {
    expect(trialMetricForRevenueCatEvent({ type: 'RENEWAL' })).toBeNull();
    expect(trialMetricForRevenueCatEvent({ type: 'RENEWAL', is_trial_conversion: false })).toBeNull();
  });

  it('maps a trial-period expiration to trial_cancelled', () => {
    expect(trialMetricForRevenueCatEvent({ type: 'EXPIRATION', period_type: 'TRIAL' })).toBe('trial_cancelled');
  });

  it('does not treat a paid-period expiration as a trial cancellation', () => {
    expect(trialMetricForRevenueCatEvent({ type: 'EXPIRATION', period_type: 'NORMAL' })).toBeNull();
  });

  it('returns null for non-trial transitions (no invented states)', () => {
    expect(trialMetricForRevenueCatEvent({ type: 'CANCELLATION', period_type: 'TRIAL' })).toBeNull();
    expect(trialMetricForRevenueCatEvent({ type: 'BILLING_ISSUE' })).toBeNull();
    expect(trialMetricForRevenueCatEvent({ type: 'PRODUCT_CHANGE' })).toBeNull();
    expect(trialMetricForRevenueCatEvent(undefined)).toBeNull();
  });
});

describe('claimRevenueCatWebhookEvent — idempotency', () => {
  it('claims a fresh event once and rejects duplicates', async () => {
    const { db } = createFakeDb();
    await expect(claimRevenueCatWebhookEvent(db, 'evt-1', 'INITIAL_PURCHASE')).resolves.toBe(true);
    await expect(claimRevenueCatWebhookEvent(db, 'evt-1', 'INITIAL_PURCHASE')).resolves.toBe(false);
  });
});

describe('processRevenueCatWebhook — server-authoritative trial funnel', () => {
  it('returns trial_started exactly once for a trial purchase (retries do not re-fire)', async () => {
    const { db } = createFakeDb();
    const payload = {
      event: { id: 'evt-100', type: 'INITIAL_PURCHASE', app_user_id: 'app-user-1', period_type: 'TRIAL' },
    };

    const first = await processRevenueCatWebhook(db, payload);
    expect(first).toMatchObject({ handled: true, isPremium: true, trialMetric: 'trial_started' });

    const retry = await processRevenueCatWebhook(db, payload);
    expect(retry.trialMetric).toBeUndefined();
    expect(retry.isPremium).toBe(true); // entitlement sync still runs every delivery
  });

  it('returns trial_converted for a trial-conversion renewal', async () => {
    const { db } = createFakeDb();
    const result = await processRevenueCatWebhook(db, {
      event: { id: 'evt-200', type: 'RENEWAL', app_user_id: 'app-user-1', is_trial_conversion: true },
    });
    expect(result.trialMetric).toBe('trial_converted');
  });

  it('returns trial_cancelled when a trial-period entitlement expires', async () => {
    const { db } = createFakeDb();
    const result = await processRevenueCatWebhook(db, {
      event: { id: 'evt-300', type: 'EXPIRATION', app_user_id: 'app-user-1', period_type: 'TRIAL' },
    });
    expect(result.trialMetric).toBe('trial_cancelled');
    expect(result.isPremium).toBe(false);
  });

  it('emits no trial metric for non-trial events', async () => {
    const { db } = createFakeDb();
    const result = await processRevenueCatWebhook(db, {
      event: { id: 'evt-400', type: 'RENEWAL', app_user_id: 'app-user-1' },
    });
    expect(result.trialMetric).toBeUndefined();
  });

  it('stays silent when the event has no id (cannot dedup)', async () => {
    const { db } = createFakeDb();
    const result = await processRevenueCatWebhook(db, {
      event: { type: 'INITIAL_PURCHASE', app_user_id: 'app-user-1', period_type: 'TRIAL' },
    });
    expect(result.trialMetric).toBeUndefined();
  });
});
