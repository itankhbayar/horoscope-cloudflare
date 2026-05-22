import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import Stripe from 'stripe';
import billingRoutes from './billing';

const WEBHOOK_SECRET = 'whsec_test_secret';

type UserRow = {
  id: string;
  email: string;
  is_premium: 0 | 1;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

type WebhookEventRow = {
  event_id: string;
  event_type: string;
  processed_at: string | null;
  status: string;
  error: string | null;
};

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/billing', billingRoutes);
  return app;
}

function createSqliteD1(db: DatabaseSync): D1Database {
  const toD1StatementWithParams = (statement: StatementSync, params: SQLInputValue[]) => ({
    async all() {
      return { results: statement.all(...params) };
    },
    async raw() {
      return statement.all(...params).map((row) => Object.values(row as Record<string, unknown>));
    },
    async run() {
      statement.run(...params);
      return { success: true, meta: {} };
    },
  });

  const prepare = (sql: string) => {
    const statement = db.prepare(sql);
    return {
      bind: (...params: SQLInputValue[]) => toD1StatementWithParams(statement, params),
      async all() {
        return { results: statement.all() };
      },
      async raw() {
        return statement.all().map((row) => Object.values(row as Record<string, unknown>));
      },
      async run() {
        statement.run();
        return { success: true, meta: {} };
      },
    };
  };

  return {
    prepare,
    async batch(statements: Array<ReturnType<ReturnType<typeof prepare>['bind']>>) {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.all());
      }
      return results;
    },
    async exec(sql: string) {
      db.exec(sql);
      return { count: 0, duration: 0 };
    },
    dump: vi.fn(),
  } as unknown as D1Database;
}

function createSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      timezone TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_premium INTEGER NOT NULL DEFAULT 0,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT
    );

    CREATE UNIQUE INDEX users_email_idx ON users (email);

    CREATE TABLE stripe_webhook_events (
      event_id TEXT PRIMARY KEY NOT NULL,
      event_type TEXT NOT NULL,
      claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT,
      status TEXT NOT NULL DEFAULT 'processing',
      error TEXT
    );
  `);
}

function insertUser(
  db: DatabaseSync,
  values: {
    id?: string;
    email?: string;
    isPremium?: boolean;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  } = {},
) {
  db.prepare(
    `
      INSERT INTO users (
        id,
        email,
        password_hash,
        full_name,
        is_premium,
        stripe_customer_id,
        stripe_subscription_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    values.id ?? 'user-1',
    values.email ?? 'user@example.com',
    'hash',
    'Test User',
    values.isPremium ? 1 : 0,
    values.stripeCustomerId ?? null,
    values.stripeSubscriptionId ?? null,
  );
}

function getUser(db: DatabaseSync, id = 'user-1'): UserRow {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
}

function getWebhookEvent(db: DatabaseSync, eventId: string): WebhookEventRow | undefined {
  return db
    .prepare('SELECT * FROM stripe_webhook_events WHERE event_id = ?')
    .get(eventId) as WebhookEventRow | undefined;
}

function countWebhookEvents(db: DatabaseSync, eventId?: string): number {
  const row = eventId
    ? db
        .prepare('SELECT COUNT(*) AS count FROM stripe_webhook_events WHERE event_id = ?')
        .get(eventId)
    : db.prepare('SELECT COUNT(*) AS count FROM stripe_webhook_events').get();
  return (row as { count: number }).count;
}

function checkoutSessionCompletedEvent(id = 'evt_checkout_completed'): Stripe.Event {
  return {
    id,
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: 1_769_000_000,
    livemode: false,
    pending_webhooks: 1,
    request: { id: 'req_checkout', idempotency_key: null },
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        object: 'checkout.session',
        mode: 'subscription',
        status: 'complete',
        payment_status: 'paid',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        metadata: { userId: 'user-1' },
      },
    },
  } as unknown as Stripe.Event;
}

function subscriptionUpdatedEvent(
  status: Stripe.Subscription.Status,
  id = 'evt_subscription_updated',
): Stripe.Event {
  return {
    id,
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: 1_769_000_100,
    livemode: false,
    pending_webhooks: 1,
    request: { id: 'req_sub_updated', idempotency_key: null },
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_test_123',
        object: 'subscription',
        customer: 'cus_test_123',
        status,
        metadata: { userId: 'user-1' },
        items: {
          object: 'list',
          data: [{ id: 'si_test_123', object: 'subscription_item', price: { id: 'price_123' } }],
          has_more: false,
          url: '/v1/subscription_items?subscription=sub_test_123',
        },
      },
    },
  } as unknown as Stripe.Event;
}

function subscriptionDeletedEvent(id = 'evt_subscription_deleted'): Stripe.Event {
  return {
    ...subscriptionUpdatedEvent('canceled', id),
    type: 'customer.subscription.deleted',
  } as Stripe.Event;
}

function invoicePaymentFailedEvent(id = 'evt_invoice_payment_failed'): Stripe.Event {
  return {
    id,
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: 1_769_000_200,
    livemode: false,
    pending_webhooks: 1,
    request: { id: 'req_invoice_failed', idempotency_key: null },
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: 'in_test_failed',
        object: 'invoice',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        status: 'open',
        paid: false,
        attempt_count: 1,
      },
    },
  } as unknown as Stripe.Event;
}

function unknownEvent(id = 'evt_unknown'): Stripe.Event {
  return {
    id,
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: 1_769_000_300,
    livemode: false,
    pending_webhooks: 1,
    request: { id: 'req_unknown', idempotency_key: null },
    type: 'customer.created',
    data: { object: { id: 'cus_test_123', object: 'customer' } },
  } as unknown as Stripe.Event;
}

function signedWebhookRequest(event: Stripe.Event, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature,
    },
    body: payload,
  };
}

const baseEnv = {
  APP_PUBLIC_URL: 'http://localhost:5173',
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_PRICE_ID: 'price_123',
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
} as const;

describe('Stripe billing webhook integration', () => {
  let sqlite: DatabaseSync;
  let env: typeof baseEnv & { horoscope_db: D1Database };

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    createSchema(sqlite);
    env = { ...baseEnv, horoscope_db: createSqliteD1(sqlite) };
  });

  afterEach(() => {
    sqlite.close();
    vi.restoreAllMocks();
  });

  it('processes checkout.session.completed and ignores duplicate delivery side effects', async () => {
    insertUser(sqlite);
    const app = createApp();
    const event = checkoutSessionCompletedEvent();
    const request = signedWebhookRequest(event);

    const first = await app.request('/api/billing/webhook', request, env);
    const second = await app.request('/api/billing/webhook', request, env);

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ received: true });
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toEqual({ received: true });
    expect(countWebhookEvents(sqlite, event.id)).toBe(1);
    expect(getWebhookEvent(sqlite, event.id)).toEqual(
      expect.objectContaining({
        event_type: 'checkout.session.completed',
        status: 'processed',
        error: null,
      }),
    );
    expect(getWebhookEvent(sqlite, event.id)?.processed_at).toEqual(expect.any(String));
    expect(getUser(sqlite)).toEqual(
      expect.objectContaining({
        is_premium: 1,
        stripe_customer_id: 'cus_test_123',
        stripe_subscription_id: 'sub_test_123',
      }),
    );
  });

  it('processes customer.subscription.updated and grants active premium entitlement', async () => {
    insertUser(sqlite, { stripeCustomerId: 'cus_test_123' });
    const app = createApp();
    const event = subscriptionUpdatedEvent('active');

    const res = await app.request('/api/billing/webhook', signedWebhookRequest(event), env);

    expect(res.status).toBe(200);
    expect(getWebhookEvent(sqlite, event.id)).toEqual(
      expect.objectContaining({
        event_type: 'customer.subscription.updated',
        status: 'processed',
      }),
    );
    expect(getUser(sqlite)).toEqual(
      expect.objectContaining({
        is_premium: 1,
        stripe_subscription_id: 'sub_test_123',
      }),
    );
  });

  it('processes customer.subscription.deleted and revokes premium entitlement', async () => {
    insertUser(sqlite, {
      isPremium: true,
      stripeCustomerId: 'cus_test_123',
      stripeSubscriptionId: 'sub_test_123',
    });
    const app = createApp();
    const event = subscriptionDeletedEvent();

    const res = await app.request('/api/billing/webhook', signedWebhookRequest(event), env);

    expect(res.status).toBe(200);
    expect(getWebhookEvent(sqlite, event.id)).toEqual(
      expect.objectContaining({
        event_type: 'customer.subscription.deleted',
        status: 'processed',
      }),
    );
    expect(getUser(sqlite)).toEqual(
      expect.objectContaining({
        is_premium: 0,
        stripe_subscription_id: null,
      }),
    );
  });

  it('records invoice.payment_failed and preserves premium because no grace-period mutation exists', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    insertUser(sqlite, {
      isPremium: true,
      stripeCustomerId: 'cus_test_123',
      stripeSubscriptionId: 'sub_test_123',
    });
    const app = createApp();
    const event = invoicePaymentFailedEvent();

    const res = await app.request('/api/billing/webhook', signedWebhookRequest(event), env);

    expect(res.status).toBe(200);
    expect(getWebhookEvent(sqlite, event.id)).toEqual(
      expect.objectContaining({
        event_type: 'invoice.payment_failed',
        status: 'processed',
        error: null,
      }),
    );
    expect(getUser(sqlite)).toEqual(
      expect.objectContaining({
        is_premium: 1,
        stripe_customer_id: 'cus_test_123',
        stripe_subscription_id: 'sub_test_123',
      }),
    );
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('billing_invoice_payment_failed'));
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('"invoiceId":"in_test_failed"'));
  });

  it('returns 400 for invalid Stripe webhook signatures', async () => {
    insertUser(sqlite);
    const app = createApp();
    const event = checkoutSessionCompletedEvent('evt_bad_signature');
    const payload = JSON.stringify(event);

    const res = await app.request(
      '/api/billing/webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': Stripe.webhooks.generateTestHeaderString({
            payload,
            secret: 'whsec_wrong_secret',
          }),
        },
        body: payload,
      },
      env,
    );

    expect(res.status).toBe(400);
    await expect(res.text()).resolves.toBe('Invalid signature');
    expect(countWebhookEvents(sqlite)).toBe(0);
  });

  it('returns 503 when the webhook secret is missing', async () => {
    insertUser(sqlite);
    const app = createApp();
    const event = checkoutSessionCompletedEvent('evt_missing_secret');

    const res = await app.request('/api/billing/webhook', signedWebhookRequest(event), {
      ...env,
      STRIPE_WEBHOOK_SECRET: '',
    });

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: 'Billing is not configured' });
    expect(countWebhookEvents(sqlite)).toBe(0);
  });

  it('returns 200 for unknown event types without applying side effects', async () => {
    insertUser(sqlite);
    const app = createApp();
    const event = unknownEvent();

    const res = await app.request('/api/billing/webhook', signedWebhookRequest(event), env);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
    expect(countWebhookEvents(sqlite)).toBe(0);
    expect(getUser(sqlite)).toEqual(
      expect.objectContaining({
        is_premium: 0,
        stripe_customer_id: null,
        stripe_subscription_id: null,
      }),
    );
  });
});
