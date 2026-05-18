import Stripe from 'stripe';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { premiumCheckoutUrls } from '../env';
import { stripeWebhookEvents, users } from '../db/schema';
import { getUserById } from './authService';

/**
 * Ephemeral keys must use a Stripe API version compatible with the installed
 * `stripe` npm package (see `stripe` package `ApiVersion`) and @stripe/stripe-react-native.
 */
export const STRIPE_MOBILE_API_VERSION = '2025-02-24.acacia' as const;

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function getAllowedPremiumPriceIds(env: {
  STRIPE_PRICE_ID?: string;
  STRIPE_PREMIUM_PRICE_ID_TEST?: string;
}): string[] {
  const raw = [env.STRIPE_PRICE_ID?.trim(), env.STRIPE_PREMIUM_PRICE_ID_TEST?.trim()].filter(
    (v): v is string => Boolean(v && v.length > 0),
  );
  return [...new Set(raw)];
}

export function assertAllowedPremiumPriceId(
  priceId: string,
  env: { STRIPE_PRICE_ID?: string; STRIPE_PREMIUM_PRICE_ID_TEST?: string },
): void {
  const allowed = getAllowedPremiumPriceIds(env);
  if (!allowed.includes(priceId)) {
    throw new Error('Invalid or disallowed price id');
  }
}

export async function createPremiumCheckoutSession(
  stripe: Stripe,
  priceId: string,
  userId: string,
  customerEmail: string,
  appPublicUrl: string,
): Promise<Stripe.Checkout.Session> {
  const price = await stripe.prices.retrieve(priceId);
  const mode: Stripe.Checkout.SessionCreateParams.Mode =
    price.type === 'recurring' ? 'subscription' : 'payment';

  const { successUrl, cancelUrl } = premiumCheckoutUrls(appPublicUrl);

  return stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    customer_email: customerEmail,
  });
}

export type MobilePremiumCheckoutResult =
  | {
      mode: 'subscription';
      paymentIntentClientSecret: string;
      customerId: string;
      customerEphemeralKeySecret: string;
      subscriptionId: string;
    }
  | {
      mode: 'payment';
      paymentIntentClientSecret: string;
    };

/**
 * Prepare Stripe objects for React Native PaymentSheet (subscription or one-time price).
 * Reuses the same Stripe Price objects as web Checkout; never trusts client price without allowlist.
 */
export async function createMobilePremiumPaymentSheet(
  stripe: Stripe,
  db: DB,
  params: {
    userId: string;
    email: string;
    priceId: string;
    idempotencyKey?: string;
  },
): Promise<MobilePremiumCheckoutResult> {
  const { userId, email, priceId, idempotencyKey } = params;
  const user = await getUserById(db, userId);
  if (!user) {
    throw new Error('User not found');
  }

  const idem = (suffix: string): string | undefined =>
    idempotencyKey ? `${idempotencyKey}:${suffix}` : undefined;

  const price = await stripe.prices.retrieve(priceId);
  if (price.type === 'recurring') {
    const customerId = await getOrCreateStripeCustomer(stripe, db, userId, email, idem('cust'));

    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        metadata: { userId },
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      },
      { idempotencyKey: idem('sub') },
    );

    const secret = extractPaymentIntentClientSecret(subscription);
    if (!secret) {
      throw new Error('Subscription is missing PaymentIntent client secret');
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: STRIPE_MOBILE_API_VERSION, idempotencyKey: idem('eph') },
    );

    if (!ephemeralKey.secret) {
      throw new Error('Ephemeral key missing secret');
    }

    await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
      })
      .where(eq(users.id, userId));

    return {
      mode: 'subscription',
      paymentIntentClientSecret: secret,
      customerId,
      customerEphemeralKeySecret: ephemeralKey.secret,
      subscriptionId: subscription.id,
    };
  }

  const unitAmount = price.unit_amount;
  if (unitAmount == null || unitAmount <= 0) {
    throw new Error('Price is missing unit_amount');
  }

  const pi = await stripe.paymentIntents.create(
    {
      amount: unitAmount,
      currency: price.currency,
      metadata: { userId },
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey: idem('pi') },
  );

  if (!pi.client_secret) {
    throw new Error('PaymentIntent missing client secret');
  }

  return {
    mode: 'payment',
    paymentIntentClientSecret: pi.client_secret,
  };
}

async function getOrCreateStripeCustomer(
  stripe: Stripe,
  db: DB,
  userId: string,
  email: string,
  idempotencyKey?: string,
): Promise<string> {
  const existing = await getUserById(db, userId);
  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const customer = await stripe.customers.create(
    { email, metadata: { userId } },
    { idempotencyKey },
  );

  const updated = await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(and(eq(users.id, userId), isNull(users.stripeCustomerId)))
    .returning({ id: users.id, stripeCustomerId: users.stripeCustomerId });

  if (updated.length === 0) {
    const again = await getUserById(db, userId);
    if (again?.stripeCustomerId) return again.stripeCustomerId;
  }

  return customer.id;
}

function extractPaymentIntentClientSecret(subscription: Stripe.Subscription): string | null {
  const inv = subscription.latest_invoice;
  if (!inv || typeof inv === 'string') return null;
  const pi = inv.payment_intent;
  if (!pi || typeof pi === 'string') return null;
  return pi.client_secret ?? null;
}

export async function createBillingPortalSession(
  stripe: Stripe,
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/** Returns true if this event was newly claimed (should apply side effects). */
export async function claimStripeWebhookEvent(db: DB, eventId: string): Promise<boolean> {
  const rows = await db
    .insert(stripeWebhookEvents)
    .values({ id: eventId })
    .onConflictDoNothing()
    .returning({ id: stripeWebhookEvents.id });
  return rows.length > 0;
}

export async function releaseStripeWebhookClaim(db: DB, eventId: string): Promise<void> {
  await db.delete(stripeWebhookEvents).where(eq(stripeWebhookEvents.id, eventId));
}

export async function grantPremiumFromCheckoutSession(
  db: DB,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId?.trim();
  if (!userId) {
    console.error('[billing] checkout.session.completed missing metadata.userId', session.id);
    return;
  }

  const user = await getUserById(db, userId);
  if (!user) {
    console.error('[billing] checkout.session.completed unknown user', userId);
    return;
  }

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer && typeof session.customer !== 'string'
        ? session.customer.id
        : null;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription && typeof session.subscription !== 'string'
        ? session.subscription.id
        : null;

  await db
    .update(users)
    .set({
      isPremium: true,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      updatedAt: sql`(CURRENT_TIMESTAMP)`,
    })
    .where(eq(users.id, userId));
}

async function grantPremiumForUserId(db: DB, userId: string): Promise<void> {
  const user = await getUserById(db, userId);
  if (!user) {
    console.error('[billing] grant premium unknown user', userId);
    return;
  }
  await db
    .update(users)
    .set({ isPremium: true, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(eq(users.id, userId));
}

async function setPremiumForUserId(db: DB, userId: string, isPremium: boolean): Promise<void> {
  await db
    .update(users)
    .set({ isPremium, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(eq(users.id, userId));
}

async function resolveUserIdFromSubscription(db: DB, sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.userId?.trim();
  if (fromMeta) return fromMeta;
  const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (!custId) return null;
  const row = await db.select().from(users).where(eq(users.stripeCustomerId, custId)).get();
  return row?.id ?? null;
}

async function resolveUserIdFromCustomerId(db: DB, customerId: string): Promise<string | null> {
  const row = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).get();
  return row?.id ?? null;
}

export async function grantPremiumFromPaymentIntent(db: DB, pi: Stripe.PaymentIntent): Promise<void> {
  const userId = pi.metadata?.userId?.trim();
  if (!userId) {
    return;
  }
  await grantPremiumForUserId(db, userId);
}

export async function syncPremiumFromSubscription(db: DB, sub: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserIdFromSubscription(db, sub);
  if (!userId) {
    console.error('[billing] subscription missing resolvable user', sub.id);
    return;
  }

  const active = sub.status === 'active' || sub.status === 'trialing';
  await db
    .update(users)
    .set({
      isPremium: active,
      stripeSubscriptionId: sub.id,
      updatedAt: sql`(CURRENT_TIMESTAMP)`,
    })
    .where(eq(users.id, userId));
}

export async function revokePremiumFromSubscription(db: DB, sub: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserIdFromSubscription(db, sub);
  if (!userId) {
    console.error('[billing] subscription.deleted missing resolvable user', sub.id);
    return;
  }
  await db
    .update(users)
    .set({
      isPremium: false,
      stripeSubscriptionId: null,
      updatedAt: sql`(CURRENT_TIMESTAMP)`,
    })
    .where(eq(users.id, userId));
}

export async function handleInvoicePaid(db: DB, invoice: Stripe.Invoice): Promise<void> {
  const subId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null;
  if (!subId) return;

  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
  if (!customerId) return;

  const userId = await resolveUserIdFromCustomerId(db, customerId);
  if (!userId) {
    console.error('[billing] invoice.paid unknown customer', customerId);
    return;
  }

  await db
    .update(users)
    .set({
      isPremium: true,
      stripeSubscriptionId: subId,
      updatedAt: sql`(CURRENT_TIMESTAMP)`,
    })
    .where(eq(users.id, userId));
}

export async function handleInvoicePaymentFailed(db: DB, invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
  console.error('[billing] invoice.payment_failed', {
    invoiceId: invoice.id,
    customerId,
    subscription: invoice.subscription,
  });
}

export async function processStripeWebhookEvent(db: DB, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await grantPremiumFromCheckoutSession(db, session);
      return;
    }
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await grantPremiumFromPaymentIntent(db, pi);
      return;
    }
    case 'invoice.paid':
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(db, invoice);
      return;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(db, invoice);
      return;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await syncPremiumFromSubscription(db, sub);
      return;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await revokePremiumFromSubscription(db, sub);
      return;
    }
    default:
      return;
  }
}

/**
 * Server-authoritative restore path for mobile: pull current Stripe subscription status
 * for a known user and sync `isPremium` even if earlier webhooks were missed.
 */
export async function syncPremiumFromStripeForUser(
  stripe: Stripe,
  db: DB,
  userId: string,
): Promise<{ isPremium: boolean; source: 'subscription' | 'customer' | 'none' }> {
  const user = await getUserById(db, userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.stripeSubscriptionId) {
    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    await syncPremiumFromSubscription(db, sub);
    const active = sub.status === 'active' || sub.status === 'trialing';
    return { isPremium: active, source: 'subscription' };
  }

  if (user.stripeCustomerId) {
    const list = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 5,
    });
    const candidate =
      list.data.find((s) => s.status === 'active' || s.status === 'trialing') ??
      list.data.find((s) => s.status === 'past_due' || s.status === 'unpaid') ??
      list.data[0];

    if (candidate) {
      await syncPremiumFromSubscription(db, candidate);
      const active = candidate.status === 'active' || candidate.status === 'trialing';
      return { isPremium: active, source: 'customer' };
    }
  }

  await setPremiumForUserId(db, userId, false);
  return { isPremium: false, source: 'none' };
}
