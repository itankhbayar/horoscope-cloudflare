import { eq, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { users } from '../db/schema';
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
    type?: string;
    app_user_id?: string;
    aliases?: string[];
    entitlement_ids?: string[] | null;
  };
};

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
): Promise<{ handled: boolean; userId?: string; isPremium?: boolean }> {
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
  return { handled: true, userId: appUserId, isPremium };
}
