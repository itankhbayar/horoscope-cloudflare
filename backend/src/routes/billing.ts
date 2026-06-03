import { Hono } from 'hono';
import type { Context } from 'hono';
import type Stripe from 'stripe';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { getUserById } from '../services/authService';
import {
  assertAllowedPremiumPriceId,
  createBillingPortalSession,
  createMobilePremiumPaymentSheet,
  createPremiumCheckoutSession,
  createStripeClient,
  processStripeWebhookEventIdempotently,
  resolveUserIdFromSubscription,
  syncPremiumFromCheckoutSession,
  syncPremiumFromStripeForUser,
} from '../services/billingService';
import { trackBackendEvent } from '../services/analyticsService';
import { isAllowedReturnUrl, resolveAppPublicUrl } from '../env';
import {
  processRevenueCatWebhook,
  syncPremiumFromRevenueCatApi,
  verifyRevenueCatWebhookAuthorization,
  type RevenueCatWebhookPayload,
} from '../services/revenueCatService';
import type { AppBindings, AppVariables } from '../types';
import {
  REVENUECAT_SYNC_NOT_CONFIGURED,
  REVENUECAT_WEBHOOK_NOT_CONFIGURED,
} from './billingRevenueCatErrors';
import { captureException } from '../utils/sentry';
import { logFromContext, metric } from '../utils/logger';
import {
  checkoutSyncSchema,
  mobileCheckoutSchema,
  mobilePortalSchema,
  revenueCatWebhookSchema,
} from '../schemas/billing';
import { parseJsonBody, isResponse } from '../validators/request';
import { fail, ok } from '../utils/apiResponse';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

/**
 * Mirror a server-authoritative trial event to PostHog without blocking the webhook response.
 * `trackBackendEvent` never rejects; the try/catch only guards environments (e.g. tests) where
 * no ExecutionContext is attached, so the mirror stays strictly fire-and-forget.
 *
 * OWNERSHIP: only ever called with BACKEND_OWNED events (the trial trio) and only on freshly-claimed
 * webhook deliveries, so replays/retries never double-count. See docs/analytics-event-ownership.md.
 */
function mirrorTrialEvent(
  c: Context<{ Bindings: AppBindings; Variables: AppVariables }>,
  input: Parameters<typeof trackBackendEvent>[0],
): void {
  const task = trackBackendEvent(input);
  try {
    c.executionCtx.waitUntil(task);
  } catch {
    void task;
  }
}

const WEBHOOK_HANDLED = new Set<string>([
  'checkout.session.completed',
  'payment_intent.succeeded',
  'invoice.paid',
  /** Often fired for subscription invoices (same payload shape as invoice.paid). */
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  /** Grants premium when a trial subscription is created (web Checkout + mobile PaymentSheet). */
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

/**
 * Maps a Stripe webhook event to a trial-funnel analytics metric, or null when the event is
 * not a trial transition. Detection is server-authoritative so it covers every checkout entry
 * point. Emitted only for freshly-processed events so idempotent retries never double-count.
 */
function trialMetricForEvent(event: Stripe.Event): 'trial_started' | 'trial_converted' | 'trial_cancelled' | null {
  if (event.type === 'customer.subscription.created') {
    const sub = event.data.object as Stripe.Subscription;
    /**
     * Single authoritative trial_started for every Stripe entry point (web Checkout + mobile
     * PaymentSheet). Emitted here — not on checkout.session.completed — so the web flow, which
     * fires both events, never double-counts.
     */
    if (sub.status === 'trialing') return 'trial_started';
    return null;
  }
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    const previous = (event.data as { previous_attributes?: Partial<Stripe.Subscription> })
      .previous_attributes;
    if (previous?.status === 'trialing' && sub.status === 'active') return 'trial_converted';
    return null;
  }
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    /** Cancelled while still in trial, or before the trial-end charge ever happened. */
    if (sub.status === 'trialing') return 'trial_cancelled';
    if (sub.trial_end && sub.canceled_at && sub.canceled_at <= sub.trial_end) {
      return 'trial_cancelled';
    }
    return null;
  }
  return null;
}

function stripeClientEnvReady(env: AppBindings): env is AppBindings & {
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID: string;
} {
  return Boolean(env.STRIPE_SECRET_KEY?.trim() && env.STRIPE_PRICE_ID?.trim());
}

function webhookEnvReady(env: AppBindings): env is AppBindings & {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID: string;
} {
  return Boolean(stripeClientEnvReady(env) && env.STRIPE_WEBHOOK_SECRET?.trim());
}

function resolveDefaultMobilePriceId(env: AppBindings): string {
  const test = env.STRIPE_PREMIUM_PRICE_ID_TEST?.trim();
  if (test) return test;
  return env.STRIPE_PRICE_ID!.trim();
}

router.post('/create-checkout-session', authMiddleware, async (c) => {
  if (!stripeClientEnvReady(c.env)) {
    return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Billing is not configured');
  }
  const userId = requireUserId(c);
  const email = c.get('userEmail');
  try {
    const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
    const session = await createPremiumCheckoutSession(
      stripe,
      c.env.STRIPE_PRICE_ID,
      userId,
      email,
      resolveAppPublicUrl(c.env),
    );
    if (!session.url) {
      return fail(c, 500, 'INTERNAL_ERROR', 'Checkout session missing redirect URL');
    }
    metric(c.env, 'checkout_started', { channel: 'web' });
    return ok(c, { url: session.url });
  } catch (err) {
    logFromContext(c, 'error', 'checkout_session_failed', { error: err });
    captureException(err, { billing: { flow: 'create_checkout_session' } });
    return fail(c, 500, 'INTERNAL_ERROR', 'Could not start checkout');
  }
});

router.post('/checkout/sync', authMiddleware, async (c) => {
  if (!stripeClientEnvReady(c.env)) {
    return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Billing is not configured');
  }

  const body = await parseJsonBody(c, checkoutSyncSchema);
  if (isResponse(body)) return body;
  const sessionId = body.sessionId;

  const db = getDb(c.env.horoscope_db);
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
  const userId = requireUserId(c);

  try {
    const result = await syncPremiumFromCheckoutSession(stripe, db, sessionId, userId);
    if (result.isPremium) metric(c.env, 'premium_purchased', { source: 'checkout_sync' });
    return ok(c, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not sync checkout session';
    if (msg === 'User not found') return fail(c, 404, 'NOT_FOUND', msg);
    if (
      msg === 'Checkout session does not belong to user' ||
      msg === 'Checkout session is not paid'
    ) {
      return fail(c, 400, 'BAD_REQUEST', msg);
    }
    logFromContext(c, 'error', 'checkout_sync_failed', { error: err });
    captureException(err, { billing: { flow: 'checkout_sync' } });
    return fail(c, 500, 'INTERNAL_ERROR', 'Could not sync checkout session');
  }
});

router.post('/mobile/checkout', authMiddleware, async (c) => {
  if (!stripeClientEnvReady(c.env)) {
    return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Billing is not configured');
  }
  const userId = requireUserId(c);
  const email = c.get('userEmail');
  const body = await parseJsonBody(c, mobileCheckoutSchema);
  if (isResponse(body)) return body;

  const rawPrice = typeof body.priceId === 'string' ? body.priceId.trim() : '';
  const priceId = rawPrice.length > 0 ? rawPrice : resolveDefaultMobilePriceId(c.env);

  try {
    assertAllowedPremiumPriceId(priceId, c.env);
  } catch {
    return fail(c, 400, 'BAD_REQUEST', 'Invalid or disallowed price id');
  }

  const idempotencyKey =
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim().length > 0
      ? body.idempotencyKey.trim()
      : c.req.header('Idempotency-Key')?.trim() || undefined;

  const db = getDb(c.env.horoscope_db);
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);

  try {
    const sheet = await createMobilePremiumPaymentSheet(stripe, db, {
      userId,
      email,
      priceId,
      idempotencyKey,
    });
    metric(c.env, 'checkout_started', { channel: 'mobile', mode: sheet.mode });
    return ok(c, sheet);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not start mobile checkout';
    logFromContext(c, 'error', 'mobile_checkout_failed', { error: err });
    captureException(err, { billing: { flow: 'mobile_checkout' } });
    if (msg.includes('Invalid or disallowed')) {
      return fail(c, 400, 'BAD_REQUEST', 'Invalid or disallowed price id');
    }
    if (msg === 'User not found') {
      return fail(c, 404, 'NOT_FOUND', 'User not found');
    }
    return fail(c, 500, 'INTERNAL_ERROR', 'Could not start mobile checkout');
  }
});

router.post('/mobile/portal', authMiddleware, async (c) => {
  if (!stripeClientEnvReady(c.env)) {
    return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Billing is not configured');
  }
  const userId = requireUserId(c);
  const body = await parseJsonBody(c, mobilePortalSchema);
  if (isResponse(body)) return body;
  const returnUrl = body.returnUrl;
  if (!returnUrl || !isAllowedReturnUrl(returnUrl, c.env)) {
    return fail(c, 400, 'BAD_REQUEST', 'Valid returnUrl is required (APP_PUBLIC_URL https, localhost http, or astralis://)');
  }

  const db = getDb(c.env.horoscope_db);
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
  const user = await getUserById(db, userId);
  if (!user?.stripeCustomerId) {
    return fail(c, 409, 'CONFLICT', 'No Stripe customer on file yet. Complete a purchase first to manage billing.');
  }

  try {
    const session = await createBillingPortalSession(stripe, user.stripeCustomerId, returnUrl);
    if (!session.url) {
      return fail(c, 500, 'INTERNAL_ERROR', 'Portal session missing URL');
    }
    return ok(c, { url: session.url });
  } catch (err) {
    logFromContext(c, 'error', 'mobile_portal_failed', { error: err });
    captureException(err, { billing: { flow: 'mobile_portal' } });
    return fail(c, 500, 'INTERNAL_ERROR', 'Could not open billing portal');
  }
});

router.post('/mobile/restore', authMiddleware, async (c) => {
  if (!stripeClientEnvReady(c.env)) {
    return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Billing is not configured');
  }
  const userId = requireUserId(c);
  const db = getDb(c.env.horoscope_db);
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
  try {
    const result = await syncPremiumFromStripeForUser(stripe, db, userId);
    metric(c.env, 'subscription_restored', { source: result.source, isPremium: result.isPremium });
    return ok(c, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not restore premium';
    if (msg === 'User not found') return fail(c, 404, 'NOT_FOUND', msg);
    logFromContext(c, 'error', 'mobile_restore_failed', { error: err });
    captureException(err, { billing: { flow: 'mobile_restore' } });
    return fail(c, 500, 'INTERNAL_ERROR', 'Could not restore premium');
  }
});

function revenueCatEnvReady(env: AppBindings): env is AppBindings & {
  REVENUECAT_WEBHOOK_SECRET: string;
} {
  return Boolean(env.REVENUECAT_WEBHOOK_SECRET?.trim());
}

function revenueCatApiEnvReady(env: AppBindings): env is AppBindings & {
  REVENUECAT_API_KEY: string;
} {
  return Boolean(env.REVENUECAT_API_KEY?.trim());
}

router.post('/revenuecat/webhook', async (c) => {
  if (!revenueCatEnvReady(c.env)) {
    return fail(c, 503, 'SERVICE_UNAVAILABLE', REVENUECAT_WEBHOOK_NOT_CONFIGURED);
  }

  const authorization = c.req.header('Authorization');
  if (!verifyRevenueCatWebhookAuthorization(authorization, c.env.REVENUECAT_WEBHOOK_SECRET)) {
    return fail(c, 401, 'UNAUTHORIZED', 'Unauthorized');
  }

  const payload = await parseJsonBody(c, revenueCatWebhookSchema);
  if (isResponse(payload)) return payload;

  const db = getDb(c.env.horoscope_db);
  try {
    const result = await processRevenueCatWebhook(db, payload, {
      apiKey: c.env.REVENUECAT_API_KEY,
    });
    metric(c.env, 'revenuecat_webhook_processed', {
      eventType: payload.event?.type,
      handled: result.handled,
      isPremium: result.isPremium,
    });
    // Server-authoritative trial funnel (parity with Stripe). Emitted at most once per event:
    // the service only returns `trialMetric` on the first, freshly-claimed delivery.
    if (result.trialMetric) {
      metric(c.env, result.trialMetric, {
        source: 'revenuecat_webhook',
        eventType: payload.event?.type,
        periodType: payload.event?.period_type,
      });
      // Mirror to PostHog. app_user_id is our users.id, so it is a stable distinct_id.
      mirrorTrialEvent(c, {
        env: c.env,
        distinctId: result.userId,
        event: result.trialMetric,
        properties: { provider: 'revenuecat', eventType: payload.event?.type },
      });
    }
    return ok(c, { received: true, ...result });
  } catch (err) {
    logFromContext(c, 'error', 'revenuecat_webhook_failed', { error: err });
    captureException(err, { billing: { flow: 'revenuecat_webhook' } });
    return fail(c, 500, 'INTERNAL_ERROR', 'Webhook processing failed');
  }
});

router.post('/revenuecat/sync', authMiddleware, async (c) => {
  if (!revenueCatApiEnvReady(c.env)) {
    return fail(c, 503, 'SERVICE_UNAVAILABLE', REVENUECAT_SYNC_NOT_CONFIGURED);
  }

  const userId = requireUserId(c);
  const db = getDb(c.env.horoscope_db);

  try {
    const result = await syncPremiumFromRevenueCatApi(db, c.env.REVENUECAT_API_KEY, userId);
    metric(c.env, 'subscription_restored', { source: 'revenuecat_api', isPremium: result.isPremium });
    return ok(c, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not sync RevenueCat status';
    if (msg === 'User not found') return fail(c, 404, 'NOT_FOUND', msg);
    logFromContext(c, 'error', 'revenuecat_sync_failed', { error: err });
    captureException(err, { billing: { flow: 'revenuecat_sync' } });
    return fail(c, 500, 'INTERNAL_ERROR', 'Could not sync RevenueCat status');
  }
});

router.post('/webhook', async (c) => {
  if (!webhookEnvReady(c.env)) {
    return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Billing is not configured');
  }

  const signature =
    c.req.header('stripe-signature') ?? c.req.header('Stripe-Signature') ?? undefined;
  if (!signature) {
    return c.text('Missing stripe-signature', 400);
  }

  const rawBody = await c.req.text();
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);

  /** Trailing newline in .env / copy-paste breaks Stripe's HMAC check. */
  const webhookSecret = (c.env.STRIPE_WEBHOOK_SECRET ?? '').trim();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    logFromContext(c, 'warn', 'stripe_webhook_signature_failed', { error: err });
    metric(c.env, 'stripe_webhook_signature_failed');
    return c.text('Invalid signature', 400);
  }

  if (!WEBHOOK_HANDLED.has(event.type)) {
    metric(c.env, 'stripe_webhook_ignored', { eventType: event.type });
    return ok(c, { received: true });
  }

  const db = getDb(c.env.horoscope_db);
  try {
    const result = await processStripeWebhookEventIdempotently(db, event);
    metric(c.env, 'stripe_webhook_processed', {
      eventType: event.type,
      action: result.action,
      reason: result.reason,
    });
    if (event.type === 'checkout.session.completed' && result.action === 'process') {
      metric(c.env, 'premium_purchased', { source: 'stripe_webhook' });
    }
    if (result.action === 'process') {
      const trialMetric = trialMetricForEvent(event);
      if (trialMetric) {
        metric(c.env, trialMetric, { source: 'stripe_webhook', eventType: event.type });
        // Mirror the server-authoritative trial event to PostHog (fire-and-forget, fails open).
        const distinctId = await resolveUserIdFromSubscription(db, event.data.object as Stripe.Subscription);
        mirrorTrialEvent(c, {
          env: c.env,
          distinctId,
          event: trialMetric,
          properties: { provider: 'stripe', eventType: event.type },
        });
      }
    }
    if (result.action === 'skip') {
      logFromContext(c, 'info', 'stripe_webhook_duplicate_skipped', {
        eventId: event.id,
        eventType: event.type,
        reason: result.reason,
      });
    }
  } catch (err) {
    logFromContext(c, 'error', 'stripe_webhook_processing_failed', { eventType: event.type, error: err });
    captureException(err, { billing: { flow: 'stripe_webhook', eventType: event.type } });
    return c.text('Processing failed', 500);
  }

  return ok(c, { received: true });
});

export default router;
