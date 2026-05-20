import { Hono } from 'hono';
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
  syncPremiumFromCheckoutSession,
  syncPremiumFromStripeForUser,
} from '../services/billingService';
import { isAllowedReturnUrl, resolveAppPublicUrl } from '../env';
import type { AppBindings, AppVariables } from '../types';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

const WEBHOOK_HANDLED = new Set<string>([
  'checkout.session.completed',
  'payment_intent.succeeded',
  'invoice.paid',
  /** Often fired for subscription invoices (same payload shape as invoice.paid). */
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

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
    return c.json({ error: 'Billing is not configured' }, 503);
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
      return c.json({ error: 'Checkout session missing redirect URL' }, 500);
    }
    return c.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session failed', String(err));
    return c.json({ error: 'Could not start checkout' }, 500);
  }
});

router.post('/checkout/sync', authMiddleware, async (c) => {
  if (!stripeClientEnvReady(c.env)) {
    return c.json({ error: 'Billing is not configured' }, 503);
  }

  let body: { sessionId?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  const db = getDb(c.env.horoscope_db);
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
  const userId = requireUserId(c);

  try {
    const result = await syncPremiumFromCheckoutSession(stripe, db, sessionId, userId);
    return c.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not sync checkout session';
    if (msg === 'User not found') return c.json({ error: msg }, 404);
    if (
      msg === 'Checkout session does not belong to user' ||
      msg === 'Checkout session is not paid'
    ) {
      return c.json({ error: msg }, 400);
    }
    console.error('checkout/sync failed', String(err));
    return c.json({ error: 'Could not sync checkout session' }, 500);
  }
});

router.post('/mobile/checkout', authMiddleware, async (c) => {
  if (!stripeClientEnvReady(c.env)) {
    return c.json({ error: 'Billing is not configured' }, 503);
  }
  const userId = requireUserId(c);
  const email = c.get('userEmail');
  let body: { priceId?: string; idempotencyKey?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const rawPrice = typeof body.priceId === 'string' ? body.priceId.trim() : '';
  const priceId = rawPrice.length > 0 ? rawPrice : resolveDefaultMobilePriceId(c.env);

  try {
    assertAllowedPremiumPriceId(priceId, c.env);
  } catch {
    return c.json({ error: 'Invalid or disallowed price id' }, 400);
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
    return c.json(sheet);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not start mobile checkout';
    console.error('mobile/checkout failed', String(err));
    if (msg.includes('Invalid or disallowed')) {
      return c.json({ error: 'Invalid or disallowed price id' }, 400);
    }
    if (msg === 'User not found') {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json({ error: 'Could not start mobile checkout' }, 500);
  }
});

router.post('/mobile/portal', authMiddleware, async (c) => {
  if (!stripeClientEnvReady(c.env)) {
    return c.json({ error: 'Billing is not configured' }, 503);
  }
  const userId = requireUserId(c);
  let body: { returnUrl?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const returnUrl = typeof body.returnUrl === 'string' ? body.returnUrl.trim() : '';
  if (!returnUrl || !isAllowedReturnUrl(returnUrl, c.env)) {
    return c.json(
      { error: 'Valid returnUrl is required (APP_PUBLIC_URL https, localhost http, or astralis://)' },
      400,
    );
  }

  const db = getDb(c.env.horoscope_db);
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
  const user = await getUserById(db, userId);
  if (!user?.stripeCustomerId) {
    return c.json(
      { error: 'No Stripe customer on file yet. Complete a purchase first to manage billing.' },
      409,
    );
  }

  try {
    const session = await createBillingPortalSession(stripe, user.stripeCustomerId, returnUrl);
    if (!session.url) {
      return c.json({ error: 'Portal session missing URL' }, 500);
    }
    return c.json({ url: session.url });
  } catch (err) {
    console.error('mobile/portal failed', String(err));
    return c.json({ error: 'Could not open billing portal' }, 500);
  }
});

router.post('/mobile/restore', authMiddleware, async (c) => {
  if (!stripeClientEnvReady(c.env)) {
    return c.json({ error: 'Billing is not configured' }, 503);
  }
  const userId = requireUserId(c);
  const db = getDb(c.env.horoscope_db);
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
  try {
    const result = await syncPremiumFromStripeForUser(stripe, db, userId);
    return c.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not restore premium';
    if (msg === 'User not found') return c.json({ error: msg }, 404);
    console.error('mobile/restore failed', String(err));
    return c.json({ error: 'Could not restore premium' }, 500);
  }
});

router.post('/webhook', async (c) => {
  if (!webhookEnvReady(c.env)) {
    return c.json({ error: 'Billing is not configured' }, 503);
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
    console.error('stripe webhook signature failed', String(err));
    console.error(
      '[billing] If using stripe listen, set STRIPE_WEBHOOK_SECRET to the whsec_... value printed in that terminal, then restart wrangler dev. Dashboard webhook secrets differ from the CLI.',
    );
    return c.text('Invalid signature', 400);
  }

  if (!WEBHOOK_HANDLED.has(event.type)) {
    return c.json({ received: true });
  }

  const db = getDb(c.env.horoscope_db);
  try {
    const result = await processStripeWebhookEventIdempotently(db, event);
    if (result.action === 'skip') {
      console.log('[billing] duplicate Stripe webhook skipped', {
        eventId: event.id,
        eventType: event.type,
        reason: result.reason,
      });
    }
  } catch (err) {
    console.error('stripe webhook processing failed', event.type, String(err));
    return c.text('Processing failed', 500);
  }

  return c.json({ received: true });
});

export default router;
