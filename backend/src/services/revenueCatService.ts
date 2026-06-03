import { eq, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { stripeWebhookEvents, users } from '../db/schema';
import { getUserById } from './authService';
import { log } from '../utils/logger';

/** RevenueCat entitlement identifier configured in the dashboard (matches mobile). */
export const REVENUECAT_PREMIUM_ENTITLEMENT_ID = 'premium';

const GRANT_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'TEST',
]);

const REVOKE_EVENT_TYPES = new Set(['EXPIRATION']);

export type RevenueCatWebhookPayload = {
  api_version?: string;
  event?: {
    /** Globally-unique RevenueCat event id; used for idempotent metric emission. */
    id?: string;
    type?: string;
    app_user_id?: string;
    aliases?: string[];
    entitlement_ids?: string[] | null;
    /** TRIAL | NORMAL | INTRO | PROMOTIONAL — the period the event refers to. */
    period_type?: string;
    /** True on the RENEWAL that represents a trial converting to a paid period. */
    is_trial_conversion?: boolean;
  };
};

/** Trial-lifecycle analytics, sharing Stripe's exact semantics. */
export type TrialLifecycleMetric = 'trial_started' | 'trial_converted' | 'trial_cancelled';

export type RevenueCatSubscriberEntitlement = {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string;
  purchase_date?: string;
};

export type RevenueCatSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<string, RevenueCatSubscriberEntitlement>;
    subscriptions?: Record<string, unknown>;
  };
};

export function verifyRevenueCatWebhookAuthorization(
  authorizationHeader: string | undefined,
  secret: string,
): boolean {
  const expected = secret.trim();
  if (!expected) return false;
  const header = authorizationHeader?.trim() ?? '';
  if (!header) return false;
  const bearer = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : header;
  return bearer === expected;
}

export function entitlementIsActive(
  entitlement: RevenueCatSubscriberEntitlement | undefined,
  now = new Date(),
): boolean {
  if (!entitlement) return false;
  const raw = entitlement.expires_date;
  if (raw == null || raw === '') return true;
  const expires = Date.parse(raw);
  return Number.isFinite(expires) && expires > now.getTime();
}

export function hasActivePremiumFromEntitlements(
  entitlements: Record<string, RevenueCatSubscriberEntitlement> | undefined,
  entitlementId = REVENUECAT_PREMIUM_ENTITLEMENT_ID,
  now = new Date(),
): boolean {
  if (!entitlements) return false;
  return entitlementIsActive(entitlements[entitlementId], now);
}

export function resolvePremiumFromWebhookEvent(event: RevenueCatWebhookPayload['event']): boolean | null {
  if (!event?.type) return null;
  const type = event.type.toUpperCase();
  if (REVOKE_EVENT_TYPES.has(type)) return false;
  if (GRANT_EVENT_TYPES.has(type)) return true;
  if (type === 'CANCELLATION' || type === 'BILLING_ISSUE') return null;
  return null;
}

/**
 * Maps a RevenueCat webhook event to a trial-funnel metric using ONLY real RevenueCat
 * fields, with the same semantics as the Stripe webhook mapping:
 *   - trial_started   = a subscription enters its trial period
 *   - trial_converted = a trial becomes a paid subscription
 *   - trial_cancelled = a trial ends without converting to paid
 * Returns null for every non-trial transition (renewals, paid purchases, billing issues...).
 */
export function trialMetricForRevenueCatEvent(
  event: RevenueCatWebhookPayload['event'],
): TrialLifecycleMetric | null {
  const type = event?.type?.toUpperCase();
  const period = event?.period_type?.toUpperCase();
  if (!type) return null;
  // Subscription enters trial state.
  if (type === 'INITIAL_PURCHASE' && period === 'TRIAL') return 'trial_started';
  // Trial converts to paid — RevenueCat flags the first paid renewal after a trial.
  if (type === 'RENEWAL' && event?.is_trial_conversion === true) return 'trial_converted';
  // Trial lapses without converting: the trial-period entitlement expires.
  if (type === 'EXPIRATION' && period === 'TRIAL') return 'trial_cancelled';
  return null;
}

/**
 * Durably claims a RevenueCat webhook event id so its trial metric is emitted at most once.
 * Reuses the existing webhook-event ledger (keyed with an `rc:` prefix to avoid any overlap
 * with Stripe ids). Returns true only for the first delivery of a given event id; retries and
 * duplicate deliveries hit the unique-key conflict and return false. Billing/entitlement
 * writes are untouched — this gates analytics only.
 */
export async function claimRevenueCatWebhookEvent(
  db: DB,
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const rows = await db
    .insert(stripeWebhookEvents)
    .values({
      eventId: `rc:${eventId}`,
      eventType: `revenuecat:${eventType}`,
      status: 'processed',
      processedAt: sql`(CURRENT_TIMESTAMP)`,
    })
    .onConflictDoNothing()
    .returning({ eventId: stripeWebhookEvents.eventId });
  return rows.length > 0;
}

/** Resolves the trial metric for an event only if it is a fresh (non-duplicate) delivery. */
async function resolveFreshTrialMetric(
  db: DB,
  event: RevenueCatWebhookPayload['event'],
): Promise<TrialLifecycleMetric | null> {
  const metric = trialMetricForRevenueCatEvent(event);
  if (!metric) return null;
  const eventId = event?.id?.trim();
  // Without an event id we cannot dedup, so we stay silent rather than risk double-counting.
  if (!eventId) return null;
  const fresh = await claimRevenueCatWebhookEvent(db, eventId, event?.type ?? 'unknown');
  return fresh ? metric : null;
}

export async function setUserPremiumFlag(db: DB, userId: string, isPremium: boolean): Promise<void> {
  const user = await getUserById(db, userId);
  if (!user) {
    throw new Error('User not found');
  }
  await db
    .update(users)
    .set({
      isPremium,
      updatedAt: sql`(CURRENT_TIMESTAMP)`,
    })
    .where(eq(users.id, userId));
}

export async function syncPremiumFromRevenueCatSubscriber(
  db: DB,
  appUserId: string,
  entitlements: Record<string, RevenueCatSubscriberEntitlement> | undefined,
): Promise<{ isPremium: boolean; userId: string }> {
  const isPremium = hasActivePremiumFromEntitlements(entitlements);
  await setUserPremiumFlag(db, appUserId, isPremium);
  return { isPremium, userId: appUserId };
}

export async function fetchRevenueCatSubscriber(
  apiKey: string,
  appUserId: string,
): Promise<RevenueCatSubscriberResponse> {
  const key = apiKey.trim();
  if (!key) throw new Error('RevenueCat API key not configured');

  const encoded = encodeURIComponent(appUserId);
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encoded}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`RevenueCat API ${res.status}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as RevenueCatSubscriberResponse;
}

export async function syncPremiumFromRevenueCatApi(
  db: DB,
  apiKey: string,
  appUserId: string,
): Promise<{ isPremium: boolean; source: 'revenuecat_api' }> {
  const payload = await fetchRevenueCatSubscriber(apiKey, appUserId);
  const result = await syncPremiumFromRevenueCatSubscriber(
    db,
    appUserId,
    payload.subscriber?.entitlements,
  );
  return { isPremium: result.isPremium, source: 'revenuecat_api' };
}

export async function processRevenueCatWebhook(
  db: DB,
  payload: RevenueCatWebhookPayload,
  options?: { apiKey?: string },
): Promise<{ handled: boolean; userId?: string; isPremium?: boolean; trialMetric?: TrialLifecycleMetric }> {
  const appUserId = payload.event?.app_user_id?.trim();
  if (!appUserId) {
    log({}, 'warn', 'revenuecat_webhook_missing_app_user_id', { eventType: payload.event?.type });
    return { handled: false };
  }

  let isPremium = resolvePremiumFromWebhookEvent(payload.event);

  if (isPremium === null && options?.apiKey?.trim()) {
    try {
      const subscriber = await fetchRevenueCatSubscriber(options.apiKey, appUserId);
      isPremium = hasActivePremiumFromEntitlements(subscriber.subscriber?.entitlements);
    } catch (err) {
      log({}, 'error', 'revenuecat_subscriber_fetch_failed_during_webhook', { error: err });
      return { handled: false };
    }
  }

  if (isPremium === null) {
    return { handled: true };
  }

  await setUserPremiumFlag(db, appUserId, isPremium);
  // Server-authoritative trial lifecycle analytics, deduped per RevenueCat event id.
  const trialMetric = await resolveFreshTrialMetric(db, payload.event);
  return { handled: true, userId: appUserId, isPremium, ...(trialMetric ? { trialMetric } : {}) };
}
