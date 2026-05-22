import { createMiddleware } from 'hono/factory';
import { getDb } from '../db/client';
import { getUserById } from '../services/authService';
import type { AppBindings, AppVariables } from '../types';
import { metric } from '../utils/logger';

type EntitlementSnapshot = {
  isPremium?: unknown;
  subscriptionStatus?: unknown;
  premiumUntil?: unknown;
  stripeSubscriptionStatus?: unknown;
};

const ALLOWED_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

function hasUnexpiredPremiumUntil(value: unknown, now = new Date()): boolean {
  if (value == null || value === '') return true;
  if (value instanceof Date) return value.getTime() > now.getTime();
  if (typeof value === 'number') {
    const millis = value > 10_000_000_000 ? value : value * 1000;
    return millis > now.getTime();
  }
  if (typeof value !== 'string') return false;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed > now.getTime();
}

function hasAllowedStatus(value: unknown): boolean {
  if (value == null || value === '') return true;
  return typeof value === 'string' && ALLOWED_SUBSCRIPTION_STATUSES.has(value.toLowerCase());
}

export function hasActivePremiumEntitlement(user: EntitlementSnapshot | null | undefined): boolean {
  if (!user?.isPremium) return false;
  if (!hasAllowedStatus(user.subscriptionStatus)) return false;
  if (!hasAllowedStatus(user.stripeSubscriptionStatus)) return false;
  if (!hasUnexpiredPremiumUntil(user.premiumUntil)) return false;
  return true;
}

export const requirePremium = createMiddleware<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>(async (c, next) => {
  const userId = c.get('userId');
  if (!userId) {
    metric(c.env, 'premium_gate_rejected', { reason: 'missing_user' });
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const db = getDb(c.env.horoscope_db);
  const freshUser = await getUserById(db, userId);

  if (!freshUser || !hasActivePremiumEntitlement(freshUser)) {
    metric(c.env, 'premium_gate_rejected', { reason: freshUser ? 'not_premium' : 'unknown_user' });
    return c.json({ error: 'Premium subscription required' }, 403);
  }

  c.set('user', freshUser);
  await next();
});
