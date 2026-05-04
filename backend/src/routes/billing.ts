import { Hono } from 'hono';
import type Stripe from 'stripe';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import {
  claimStripeWebhookEvent,
  createPremiumCheckoutSession,
  createStripeClient,
  grantPremiumFromCheckoutSession,
  releaseStripeWebhookClaim,
} from '../services/billingService';
import type { AppBindings, AppVariables } from '../types';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

function billingEnvReady(env: AppBindings): env is AppBindings & {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID: string;
} {
  return Boolean(
    env.STRIPE_SECRET_KEY?.trim() && env.STRIPE_WEBHOOK_SECRET?.trim() && env.STRIPE_PRICE_ID?.trim(),
  );
}

router.post('/create-checkout-session', authMiddleware, async (c) => {
  if (!billingEnvReady(c.env)) {
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
    );
    if (!session.url) {
      return c.json({ error: 'Checkout session missing redirect URL' }, 500);
    }
    return c.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session failed', err);
    return c.json({ error: 'Could not start checkout' }, 500);
  }
});

router.post('/webhook', async (c) => {
  if (!billingEnvReady(c.env)) {
    return c.json({ error: 'Billing is not configured' }, 503);
  }
  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.text('Missing stripe-signature', 400);
  }

  const rawBody = await c.req.text();
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, c.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('stripe webhook signature failed', err);
    return c.text('Invalid signature', 400);
  }

  if (event.type === 'checkout.session.completed') {
    const db = getDb(c.env.horoscope_db);
    const claimed = await claimStripeWebhookEvent(db, event.id);
    if (claimed) {
      const session = event.data.object as Stripe.Checkout.Session;
      try {
        await grantPremiumFromCheckoutSession(db, session);
      } catch (err) {
        console.error('grant premium failed', err);
        await releaseStripeWebhookClaim(db, event.id);
        return c.text('Processing failed', 500);
      }
    }
  }

  return c.json({ received: true });
});

export default router;
