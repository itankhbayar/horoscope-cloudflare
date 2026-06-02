import Stripe from 'stripe';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { premiumCheckoutUrls } from '../env';
import { stripeWebhookEvents, users } from '../db/schema';
import { getUserById } from './authService';
import { log } from '../utils/logger';

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
  const checkoutSuccessUrl = `${successUrl}${
    successUrl.includes('?') ? '&' : '?'
  }session_id={CHECKOUT_SESSION_ID}`;

  return stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: checkoutSuccessUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    customer_email: customerEmail,
    /**
     * Subscriptions start with a 7-day free trial. The trial subscription is created in
     * `trialing` status, which `syncPremiumFromSubscription` and the premium middleware
     * already treat as premium. `userId` is mirrored onto the subscription metadata so trial
     * webhooks (created/updated/deleted) can resolve the user even before an invoice exists.
     * Only valid for subscription mode — one-time `payment` sessions reject `subscription_data`.
     */
    ...(mode === 'subscription'
      ? { subscription_data: { trial_period_days: PREMIUM_TRIAL_PERIOD_DAYS, metadata: { userId } } }
      : {}),
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
      /**
       * Recurring subscription that starts in a free trial. There is no charge yet, so the
       * PaymentSheet collects (and saves) a payment method via a SetupIntent instead of a
       * PaymentIntent. Stripe charges automatically when the trial ends.
       */
      mode: 'subscription_trial';
      setupIntentClientSecret: string;
      customerId: string;
      customerEphemeralKeySecret: string;
      subscriptionId: string;
    }
  | {
      mode: 'payment';
      paymentIntentClientSecret: string;
    };

/** Days of free trial granted to new mobile + web subscriptions. Keep in sync with web Checkout. */
export const PREMIUM_TRIAL_PERIOD_DAYS = 7;

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
        /**
         * 7-day free trial for recurring plans (matches web Checkout). The trial subscription is
         * created `trialing`, so the first invoice is $0 and Stripe issues a SetupIntent (rather
         * than a PaymentIntent) to collect the card for the post-trial charge.
         */
        trial_period_days: PREMIUM_TRIAL_PERIOD_DAYS,
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
      },
      { idempotencyKey: idem('sub') },
    );

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

    /** Trial subscriptions confirm a SetupIntent; immediately-charged ones confirm a PaymentIntent. */
    const setupSecret = extractSetupIntentClientSecret(subscription);
    if (setupSecret) {
      return {
        mode: 'subscription_trial',
        setupIntentClientSecret: setupSecret,
        customerId,
        customerEphemeralKeySecret: ephemeralKey.secret,
        subscriptionId: subscription.id,
      };
    }

    const secret = extractPaymentIntentClientSecret(subscription);
    if (!secret) {
      throw new Error('Subscription is missing PaymentIntent client secret');
    }

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

function extractSetupIntentClientSecret(subscription: Stripe.Subscription): string | null {
  const si = subscription.pending_setup_intent;
  if (!si || typeof si === 'string') return null;
  return si.client_secret ?? null;
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

export type StripeWebhookClaim =
  | { action: 'process'; reason: 'new' | 'retry' | 'stale' }
  | { action: 'skip'; reason: 'processed' | 'processing' };

const STRIPE_WEBHOOK_STALE_CLAIM_MINUTES = 15;

/** Durably claims a Stripe event before applying side effects. */
export async function claimStripeWebhookEvent(
  db: DB,
  eventId: string,
  eventType: string,
): Promise<StripeWebhookClaim> {
  const rows = await db
    .insert(stripeWebhookEvents)
    .values({ eventId, eventType })
    .onConflictDoNothing()
    .returning({ eventId: stripeWebhookEvents.eventId });
  if (rows.length > 0) {
    return { action: 'process', reason: 'new' };
  }

  const existing = await db
    .select()
    .from(stripeWebhookEvents)
    .where(eq(stripeWebhookEvents.eventId, eventId))
    .get();

  if (existing?.processedAt) {
    return { action: 'skip', reason: 'processed' };
  }

  if (existing?.status === 'failed') {
    const retryRows = await db
      .update(stripeWebhookEvents)
      .set({
        eventType,
        claimedAt: sql`(CURRENT_TIMESTAMP)`,
        status: 'processing',
        error: null,
      })
      .where(and(eq(stripeWebhookEvents.eventId, eventId), eq(stripeWebhookEvents.status, 'failed')))
      .returning({ eventId: stripeWebhookEvents.eventId });
    if (retryRows.length > 0) {
      return { action: 'process', reason: 'retry' };
    }
  }

  if (existing?.status === 'processing') {
    const staleRows = await db
      .update(stripeWebhookEvents)
      .set({
        eventType,
        claimedAt: sql`(CURRENT_TIMESTAMP)`,
        error: null,
      })
      .where(
        and(
          eq(stripeWebhookEvents.eventId, eventId),
          eq(stripeWebhookEvents.status, 'processing'),
          sql`${stripeWebhookEvents.claimedAt} < datetime('now', ${`-${STRIPE_WEBHOOK_STALE_CLAIM_MINUTES} minutes`})`,
        ),
      )
      .returning({ eventId: stripeWebhookEvents.eventId });
    if (staleRows.length > 0) {
      return { action: 'process', reason: 'stale' };
    }
  }

  return { action: 'skip', reason: 'processing' };
}

export async function markStripeWebhookEventProcessed(db: DB, eventId: string): Promise<void> {
  await db
    .update(stripeWebhookEvents)
    .set({
      processedAt: sql`(CURRENT_TIMESTAMP)`,
      status: 'processed',
      error: null,
    })
    .where(eq(stripeWebhookEvents.eventId, eventId));
}

export async function markStripeWebhookEventFailed(
  db: DB,
  eventId: string,
  error: string,
): Promise<void> {
  await db
    .update(stripeWebhookEvents)
    .set({
      status: 'failed',
      error: error.slice(0, 2000),
    })
    .where(eq(stripeWebhookEvents.eventId, eventId));
}

export async function grantPremiumFromCheckoutSession(
  db: DB,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId?.trim();
  if (!userId) {
    log({}, 'warn', 'billing_checkout_session_missing_user_id', { sessionId: session.id });
    return;
  }

  const user = await getUserById(db, userId);
  if (!user) {
    log({}, 'warn', 'billing_checkout_session_unknown_user', { sessionId: session.id });
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

export async function syncPremiumFromCheckoutSession(
  stripe: Stripe,
  db: DB,
  sessionId: string,
  userId: string,
): Promise<{ isPremium: boolean }> {
  const user = await getUserById(db, userId);
  if (!user) {
    throw new Error('User not found');
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.userId?.trim() !== userId) {
    throw new Error('Checkout session does not belong to user');
  }

  if (session.status !== 'complete' || session.payment_status !== 'paid') {
    throw new Error('Checkout session is not paid');
  }

  await grantPremiumFromCheckoutSession(db, session);
  return { isPremium: true };
}

async function grantPremiumForUserId(db: DB, userId: string): Promise<void> {
  const user = await getUserById(db, userId);
  if (!user) {
    log({}, 'warn', 'billing_grant_premium_unknown_user');
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
    log({}, 'warn', 'billing_subscription_missing_user', { subscriptionId: sub.id });
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
    log({}, 'warn', 'billing_subscription_deleted_missing_user', { subscriptionId: sub.id });
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
    log({}, 'warn', 'billing_invoice_paid_unknown_customer');
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
  log({}, 'warn', 'billing_invoice_payment_failed', {
    invoiceId: invoice.id,
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
    case 'customer.subscription.created':
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

export async function processStripeWebhookEventIdempotently(
  db: DB,
  event: Stripe.Event,
): Promise<StripeWebhookClaim> {
  const claim = await claimStripeWebhookEvent(db, event.id, event.type);
  if (claim.action === 'skip') {
    return claim;
  }

  try {
    await processStripeWebhookEvent(db, event);
    await markStripeWebhookEventProcessed(db, event.id);
    return claim;
  } catch (err) {
    await markStripeWebhookEventFailed(db, event.id, String(err));
    throw err;
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
