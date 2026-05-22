import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import type Stripe from 'stripe';
import { stripeEvent } from '../test/stripeFixtures';
import { createDbCapture } from '../test/mockDb';
import {
  claimStripeWebhookEvent,
  createPremiumCheckoutSession,
  grantPremiumFromCheckoutSession,
  grantPremiumFromPaymentIntent,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  processStripeWebhookEvent,
  processStripeWebhookEventIdempotently,
  revokePremiumFromSubscription,
  syncPremiumFromCheckoutSession,
  syncPremiumFromSubscription,
} from './billingService';

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
}));

vi.mock('./authService', () => ({
  getUserById: mocks.getUserById,
}));

type WebhookRow = {
  eventId: string;
  eventType: string;
  claimedAt: string;
  processedAt: string | null;
  status: string;
  error: string | null;
};

function createWebhookDb(
  initialRows: WebhookRow[] = [],
  options: { failProcessedUpdateOnce?: boolean } = {},
) {
  const rows = new Map(initialRows.map((row) => [row.eventId, { ...row }]));
  const setCalls: Record<string, unknown>[] = [];
  let activeEventId = '';
  let failProcessedUpdateOnce = options.failProcessedUpdateOnce ?? false;

  const db = {
    insert: vi.fn(() => ({
      values: vi.fn((values: { eventId: string; eventType: string }) => {
        activeEventId = values.eventId;
        return {
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(async () => {
              if (rows.has(values.eventId)) return [];
              rows.set(values.eventId, {
                eventId: values.eventId,
                eventType: values.eventType,
                claimedAt: 'now',
                processedAt: null,
                status: 'processing',
                error: null,
              });
              return [{ eventId: values.eventId }];
            }),
          })),
        };
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(async () => rows.get(activeEventId)),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        const isWebhookUpdate =
          'status' in values || 'processedAt' in values || 'error' in values || 'claimedAt' in values;
        if (!isWebhookUpdate) {
          setCalls.push(values);
        }
        return {
          where: vi.fn(() => {
            let updated = false;
            if (isWebhookUpdate) {
              if (values.status === 'processed' && failProcessedUpdateOnce) {
                failProcessedUpdateOnce = false;
                throw new Error('processed marker failed');
              }

              const row = rows.get(activeEventId);
              if (row) {
                const isStaleReclaim =
                  values.claimedAt && values.error === null && !('status' in values);
                const canUpdate = !isStaleReclaim || row.claimedAt === 'stale';
                if (canUpdate) {
                  row.eventType = typeof values.eventType === 'string' ? values.eventType : row.eventType;
                  row.claimedAt = values.claimedAt ? 'now' : row.claimedAt;
                  row.processedAt = values.processedAt ? 'now' : row.processedAt;
                  row.status = typeof values.status === 'string' ? values.status : row.status;
                  row.error =
                    values.error === null
                      ? null
                      : typeof values.error === 'string'
                        ? values.error
                        : row.error;
                  updated = true;
                }
              }
            }
            return {
              returning: vi.fn(async () => (updated ? [{ eventId: activeEventId }] : [])),
            };
          }),
        };
      }),
    })),
  } as unknown as ReturnType<typeof createDbCapture>['db'];

  return { db, rows, setCalls };
}

function createStripeWebhookEventsTable(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE stripe_webhook_events (
      event_id TEXT PRIMARY KEY NOT NULL,
      event_type TEXT NOT NULL,
      claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT,
      status TEXT NOT NULL DEFAULT 'processing',
      error TEXT
    )
  `);
}

describe('createPremiumCheckoutSession', () => {
  it('includes the Stripe checkout session id placeholder in the success URL', async () => {
    const stripe = {
      prices: { retrieve: vi.fn().mockResolvedValue({ type: 'one_time' }) },
      checkout: { sessions: { create: vi.fn().mockResolvedValue({ id: 'cs_test' }) } },
    } as unknown as Stripe;

    await createPremiumCheckoutSession(
      stripe,
      'price_123',
      'user-1',
      'user@example.com',
      'http://localhost:5173',
    );

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: 'http://localhost:5173/premium/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://localhost:5173/premium/cancel',
        metadata: { userId: 'user-1' },
      }),
    );
  });
});

describe('grantPremiumFromCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grants premium and stores Stripe ids from checkout metadata', async () => {
    const { db, setCalls } = createDbCapture();
    mocks.getUserById.mockResolvedValue({ id: 'user-1', email: 'u@example.com', isPremium: false });

    await grantPremiumFromCheckoutSession(db, {
      id: 'cs_test',
      metadata: { userId: 'user-1' },
      customer: 'cus_abc',
      subscription: 'sub_xyz',
    } as unknown as Stripe.Checkout.Session);

    expect(setCalls).toEqual([
      expect.objectContaining({
        isPremium: true,
        stripeCustomerId: 'cus_abc',
        stripeSubscriptionId: 'sub_xyz',
      }),
    ]);
  });

  it('skips update when metadata.userId is missing', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { db, setCalls } = createDbCapture();

    await grantPremiumFromCheckoutSession(db, {
      id: 'cs_test',
      metadata: {},
      customer: 'cus_abc',
    } as unknown as Stripe.Checkout.Session);

    expect(setCalls).toHaveLength(0);
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('billing_checkout_session_missing_user_id'));
    consoleWarn.mockRestore();
  });

  it('skips update when user is unknown', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { db, setCalls } = createDbCapture();
    mocks.getUserById.mockResolvedValue(null);

    await grantPremiumFromCheckoutSession(db, {
      id: 'cs_test',
      metadata: { userId: 'missing-user' },
    } as unknown as Stripe.Checkout.Session);

    expect(setCalls).toHaveLength(0);
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('billing_checkout_session_unknown_user'));
    consoleWarn.mockRestore();
  });
});

describe('syncPremiumFromCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retrieves a paid session, verifies ownership, and grants premium', async () => {
    const { db, setCalls } = createDbCapture();
    const session = {
      id: 'cs_paid',
      status: 'complete',
      payment_status: 'paid',
      metadata: { userId: 'user-1' },
      customer: 'cus_abc',
      subscription: 'sub_xyz',
    } as unknown as Stripe.Checkout.Session;
    const stripe = {
      checkout: { sessions: { retrieve: vi.fn().mockResolvedValue(session) } },
    } as unknown as Stripe;
    mocks.getUserById.mockResolvedValue({ id: 'user-1', email: 'u@example.com', isPremium: false });

    await expect(syncPremiumFromCheckoutSession(stripe, db, 'cs_paid', 'user-1')).resolves.toEqual({
      isPremium: true,
    });

    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_paid');
    expect(setCalls).toEqual([
      expect.objectContaining({
        isPremium: true,
        stripeCustomerId: 'cus_abc',
        stripeSubscriptionId: 'sub_xyz',
      }),
    ]);
  });

  it('rejects checkout sessions that belong to another user', async () => {
    const { db, setCalls } = createDbCapture();
    const stripe = {
      checkout: {
        sessions: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'cs_other',
            status: 'complete',
            payment_status: 'paid',
            metadata: { userId: 'other-user' },
          }),
        },
      },
    } as unknown as Stripe;
    mocks.getUserById.mockResolvedValue({ id: 'user-1', isPremium: false });

    await expect(syncPremiumFromCheckoutSession(stripe, db, 'cs_other', 'user-1')).rejects.toThrow(
      'Checkout session does not belong to user',
    );
    expect(setCalls).toHaveLength(0);
  });

  it('rejects incomplete or unpaid checkout sessions', async () => {
    const { db, setCalls } = createDbCapture();
    const stripe = {
      checkout: {
        sessions: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'cs_unpaid',
            status: 'open',
            payment_status: 'unpaid',
            metadata: { userId: 'user-1' },
          }),
        },
      },
    } as unknown as Stripe;
    mocks.getUserById.mockResolvedValue({ id: 'user-1', isPremium: false });

    await expect(syncPremiumFromCheckoutSession(stripe, db, 'cs_unpaid', 'user-1')).rejects.toThrow(
      'Checkout session is not paid',
    );
    expect(setCalls).toHaveLength(0);
  });
});

describe('syncPremiumFromSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('activates premium for active subscription via metadata userId', async () => {
    const { db, setCalls } = createDbCapture();

    await syncPremiumFromSubscription(db, {
      id: 'sub_1',
      status: 'active',
      metadata: { userId: 'user-1' },
      customer: 'cus_1',
    } as unknown as Stripe.Subscription);

    expect(setCalls).toEqual([
      expect.objectContaining({
        isPremium: true,
        stripeSubscriptionId: 'sub_1',
      }),
    ]);
  });

  it('deactivates premium for canceled subscription status', async () => {
    const { db, setCalls } = createDbCapture();

    await syncPremiumFromSubscription(db, {
      id: 'sub_1',
      status: 'canceled',
      metadata: { userId: 'user-1' },
      customer: 'cus_1',
    } as unknown as Stripe.Subscription);

    expect(setCalls).toEqual([
      expect.objectContaining({
        isPremium: false,
        stripeSubscriptionId: 'sub_1',
      }),
    ]);
  });

  it('resolves user by stripeCustomerId when metadata is missing', async () => {
    const { db, setCalls } = createDbCapture();
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(async () => ({ id: 'user-from-cus', stripeCustomerId: 'cus_99' })),
        })),
      })),
    })) as unknown as typeof db.select;

    await syncPremiumFromSubscription(db, {
      id: 'sub_2',
      status: 'trialing',
      metadata: {},
      customer: 'cus_99',
    } as unknown as Stripe.Subscription);

    expect(setCalls).toEqual([
      expect.objectContaining({
        isPremium: true,
        stripeSubscriptionId: 'sub_2',
      }),
    ]);
  });

  it('logs and skips when user cannot be resolved', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { db, setCalls } = createDbCapture();

    await syncPremiumFromSubscription(db, {
      id: 'sub_orphan',
      status: 'active',
      metadata: {},
      customer: 'cus_unknown',
    } as unknown as Stripe.Subscription);

    expect(setCalls).toHaveLength(0);
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('billing_subscription_missing_user'));
    consoleWarn.mockRestore();
  });
});

describe('revokePremiumFromSubscription', () => {
  it('revokes premium and clears subscription id', async () => {
    const { db, setCalls } = createDbCapture();

    await revokePremiumFromSubscription(db, {
      id: 'sub_del',
      metadata: { userId: 'user-1' },
      customer: 'cus_1',
    } as unknown as Stripe.Subscription);

    expect(setCalls).toEqual([
      expect.objectContaining({
        isPremium: false,
        stripeSubscriptionId: null,
      }),
    ]);
  });
});

describe('handleInvoicePaid', () => {
  it('grants premium when customer maps to a user', async () => {
    const { db, setCalls } = createDbCapture();
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(async () => ({ id: 'user-inv', stripeCustomerId: 'cus_inv' })),
        })),
      })),
    })) as unknown as typeof db.select;

    await handleInvoicePaid(db, {
      id: 'in_1',
      customer: 'cus_inv',
      subscription: 'sub_inv',
    } as unknown as Stripe.Invoice);

    expect(setCalls).toEqual([
      expect.objectContaining({
        isPremium: true,
        stripeSubscriptionId: 'sub_inv',
      }),
    ]);
  });

  it('no-ops when invoice has no subscription', async () => {
    const { db, setCalls } = createDbCapture();

    await handleInvoicePaid(db, {
      id: 'in_2',
      customer: 'cus_inv',
      subscription: null,
    } as unknown as Stripe.Invoice);

    expect(setCalls).toHaveLength(0);
  });
});

describe('handleInvoicePaymentFailed', () => {
  it('logs failure without throwing', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { db } = createDbCapture();

    await expect(
      handleInvoicePaymentFailed(db, {
        id: 'in_fail',
        customer: 'cus_fail',
        subscription: 'sub_fail',
      } as Stripe.Invoice),
    ).resolves.toBeUndefined();

    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('billing_invoice_payment_failed'));
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('"invoiceId":"in_fail"'));
    consoleWarn.mockRestore();
  });
});

describe('grantPremiumFromPaymentIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grants premium from payment intent metadata', async () => {
    const { db, setCalls } = createDbCapture();
    mocks.getUserById.mockResolvedValue({ id: 'user-pi', isPremium: false });

    await grantPremiumFromPaymentIntent(db, {
      id: 'pi_1',
      metadata: { userId: 'user-pi' },
    } as unknown as Stripe.PaymentIntent);

    expect(setCalls).toEqual([expect.objectContaining({ isPremium: true })]);
  });

  it('no-ops when metadata.userId is absent', async () => {
    const { db, setCalls } = createDbCapture();

    await grantPremiumFromPaymentIntent(db, { id: 'pi_2', metadata: {} } as Stripe.PaymentIntent);

    expect(setCalls).toHaveLength(0);
    expect(mocks.getUserById).not.toHaveBeenCalled();
  });
});

describe('processStripeWebhookEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes checkout.session.completed', async () => {
    const { db, setCalls } = createDbCapture();
    mocks.getUserById.mockResolvedValue({ id: 'user-1' });

    await processStripeWebhookEvent(
      db,
      stripeEvent('checkout.session.completed', {
        metadata: { userId: 'user-1' },
        customer: 'cus_1',
        subscription: 'sub_1',
      }),
    );

    expect(setCalls.some((c) => c.isPremium === true)).toBe(true);
  });

  it('routes customer.subscription.updated', async () => {
    const { db, setCalls } = createDbCapture();

    await processStripeWebhookEvent(
      db,
      stripeEvent('customer.subscription.updated', {
        id: 'sub_u',
        status: 'active',
        metadata: { userId: 'user-1' },
        customer: 'cus_1',
      }),
    );

    expect(setCalls).toEqual([expect.objectContaining({ isPremium: true, stripeSubscriptionId: 'sub_u' })]);
  });

  it('routes customer.subscription.deleted', async () => {
    const { db, setCalls } = createDbCapture();

    await processStripeWebhookEvent(
      db,
      stripeEvent('customer.subscription.deleted', {
        id: 'sub_d',
        metadata: { userId: 'user-1' },
        customer: 'cus_1',
      }),
    );

    expect(setCalls).toEqual([
      expect.objectContaining({ isPremium: false, stripeSubscriptionId: null }),
    ]);
  });

  it('routes invoice.payment_succeeded', async () => {
    const { db, setCalls } = createDbCapture();
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(async () => ({ id: 'user-inv' })),
        })),
      })),
    })) as unknown as typeof db.select;

    await processStripeWebhookEvent(
      db,
      stripeEvent('invoice.payment_succeeded', {
        customer: 'cus_inv',
        subscription: 'sub_inv',
      }),
    );

    expect(setCalls.some((c) => c.isPremium === true)).toBe(true);
  });

  it('routes invoice.payment_failed without db premium changes', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { db, setCalls } = createDbCapture();

    await processStripeWebhookEvent(
      db,
      stripeEvent('invoice.payment_failed', {
        id: 'in_x',
        customer: 'cus_x',
        subscription: 'sub_x',
      }),
    );

    expect(setCalls).toHaveLength(0);
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('billing_invoice_payment_failed'));
    consoleWarn.mockRestore();
  });

  it('routes payment_intent.succeeded', async () => {
    const { db, setCalls } = createDbCapture();
    mocks.getUserById.mockResolvedValue({ id: 'user-pi' });

    await processStripeWebhookEvent(
      db,
      stripeEvent('payment_intent.succeeded', {
        metadata: { userId: 'user-pi' },
      }),
    );

    expect(setCalls).toEqual([expect.objectContaining({ isPremium: true })]);
  });

  it('ignores unknown event types', async () => {
    const { db, setCalls } = createDbCapture();

    await processStripeWebhookEvent(db, stripeEvent('customer.created', { id: 'cus_new' }));

    expect(setCalls).toHaveLength(0);
    expect(mocks.getUserById).not.toHaveBeenCalled();
  });
});

describe('claimStripeWebhookEvent', () => {
  it('returns true for first-seen event id', async () => {
    const { db } = createDbCapture();
    const claimed = await claimStripeWebhookEvent(db, 'evt_unique', 'checkout.session.completed');
    expect(claimed).toEqual({ action: 'process', reason: 'new' });
  });
});

describe('stripe_webhook_events database constraints', () => {
  it('enforces a unique primary key on event_id in SQLite', () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      createStripeWebhookEventsTable(sqlite);

      const eventIdColumn = sqlite
        .prepare("PRAGMA table_info('stripe_webhook_events')")
        .all()
        .find((column) => (column as { name: string }).name === 'event_id') as
        | { pk: number }
        | undefined;
      expect(eventIdColumn?.pk).toBe(1);

      const insert = sqlite.prepare(
        'INSERT INTO stripe_webhook_events (event_id, event_type) VALUES (?, ?)',
      );
      insert.run('evt_unique', 'payment_intent.succeeded');

      expect(() => insert.run('evt_unique', 'payment_intent.succeeded')).toThrow();
      const row = sqlite
        .prepare('SELECT COUNT(*) AS count FROM stripe_webhook_events WHERE event_id = ?')
        .get('evt_unique') as { count: number };
      expect(row.count).toBe(1);
    } finally {
      sqlite.close();
    }
  });
});

describe('processStripeWebhookEventIdempotently', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips duplicate delivery after an event has already been processed', async () => {
    const { db, setCalls, rows } = createWebhookDb();
    const event = stripeEvent(
      'payment_intent.succeeded',
      { metadata: { userId: 'user-pi' } },
      'evt_duplicate',
    );
    mocks.getUserById.mockResolvedValue({ id: 'user-pi' });

    const first = await processStripeWebhookEventIdempotently(db, event);
    const second = await processStripeWebhookEventIdempotently(db, event);

    expect(first).toEqual({ action: 'process', reason: 'new' });
    expect(second).toEqual({ action: 'skip', reason: 'processed' });
    expect(setCalls).toEqual([expect.objectContaining({ isPremium: true })]);
    expect(rows.get('evt_duplicate')).toEqual(expect.objectContaining({ status: 'processed' }));
  });

  it('allows only one concurrent delivery to apply side effects', async () => {
    const { db, setCalls } = createWebhookDb();
    const event = stripeEvent(
      'payment_intent.succeeded',
      { metadata: { userId: 'user-pi' } },
      'evt_race',
    );
    mocks.getUserById.mockResolvedValue({ id: 'user-pi' });

    const results = await Promise.all([
      processStripeWebhookEventIdempotently(db, event),
      processStripeWebhookEventIdempotently(db, event),
    ]);

    expect(results).toContainEqual({ action: 'process', reason: 'new' });
    expect(results).toContainEqual({ action: 'skip', reason: 'processing' });
    expect(setCalls).toEqual([expect.objectContaining({ isPremium: true })]);
  });

  it('does not reclaim an active processing event before the stale window', async () => {
    const { db, setCalls, rows } = createWebhookDb([
      {
        eventId: 'evt_active',
        eventType: 'payment_intent.succeeded',
        claimedAt: 'now',
        processedAt: null,
        status: 'processing',
        error: null,
      },
    ]);
    const event = stripeEvent(
      'payment_intent.succeeded',
      { metadata: { userId: 'user-pi' } },
      'evt_active',
    );

    const result = await processStripeWebhookEventIdempotently(db, event);

    expect(result).toEqual({ action: 'skip', reason: 'processing' });
    expect(setCalls).toHaveLength(0);
    expect(rows.get('evt_active')).toEqual(
      expect.objectContaining({ status: 'processing', processedAt: null }),
    );
    expect(mocks.getUserById).not.toHaveBeenCalled();
  });

  it('retries after a failed processing attempt without deleting the event row', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db, setCalls, rows } = createWebhookDb();
    const event = stripeEvent(
      'payment_intent.succeeded',
      { metadata: { userId: 'user-pi' } },
      'evt_retry',
    );
    mocks.getUserById.mockRejectedValueOnce(new Error('temporary db failure'));
    mocks.getUserById.mockResolvedValueOnce({ id: 'user-pi' });

    await expect(processStripeWebhookEventIdempotently(db, event)).rejects.toThrow('temporary db failure');
    expect(rows.get('evt_retry')).toEqual(
      expect.objectContaining({ status: 'failed', processedAt: null }),
    );

    const retry = await processStripeWebhookEventIdempotently(db, event);

    expect(retry).toEqual({ action: 'process', reason: 'retry' });
    expect(setCalls).toEqual([expect.objectContaining({ isPremium: true })]);
    expect(rows.get('evt_retry')).toEqual(
      expect.objectContaining({ status: 'processed', error: null, processedAt: 'now' }),
    );
    consoleError.mockRestore();
  });

  it('retries a stale processing claim after a crash window', async () => {
    const { db, setCalls, rows } = createWebhookDb([
      {
        eventId: 'evt_stale',
        eventType: 'payment_intent.succeeded',
        claimedAt: 'stale',
        processedAt: null,
        status: 'processing',
        error: null,
      },
    ]);
    const event = stripeEvent(
      'payment_intent.succeeded',
      { metadata: { userId: 'user-pi' } },
      'evt_stale',
    );
    mocks.getUserById.mockResolvedValue({ id: 'user-pi' });

    const result = await processStripeWebhookEventIdempotently(db, event);

    expect(result).toEqual({ action: 'process', reason: 'stale' });
    expect(setCalls).toEqual([expect.objectContaining({ isPremium: true })]);
    expect(rows.get('evt_stale')).toEqual(
      expect.objectContaining({ status: 'processed', processedAt: 'now' }),
    );
  });

  it('retries safely if processed marker update fails after side effects complete', async () => {
    const { db, setCalls, rows } = createWebhookDb([], { failProcessedUpdateOnce: true });
    const event = stripeEvent(
      'payment_intent.succeeded',
      { metadata: { userId: 'user-pi' } },
      'evt_marker_failure',
    );
    mocks.getUserById.mockResolvedValue({ id: 'user-pi' });

    await expect(processStripeWebhookEventIdempotently(db, event)).rejects.toThrow(
      'processed marker failed',
    );
    expect(setCalls).toEqual([expect.objectContaining({ isPremium: true })]);
    expect(rows.get('evt_marker_failure')).toEqual(
      expect.objectContaining({ status: 'failed', processedAt: null }),
    );

    const retry = await processStripeWebhookEventIdempotently(db, event);

    expect(retry).toEqual({ action: 'process', reason: 'retry' });
    expect(setCalls).toEqual([
      expect.objectContaining({ isPremium: true }),
      expect.objectContaining({ isPremium: true }),
    ]);
    expect(rows.get('evt_marker_failure')).toEqual(
      expect.objectContaining({ status: 'processed', error: null, processedAt: 'now' }),
    );
  });

  it('early-returns already processed events without side effects', async () => {
    const { db, setCalls } = createWebhookDb([
      {
        eventId: 'evt_processed',
        eventType: 'payment_intent.succeeded',
        claimedAt: 'earlier',
        processedAt: 'earlier',
        status: 'processed',
        error: null,
      },
    ]);
    const event = stripeEvent(
      'payment_intent.succeeded',
      { metadata: { userId: 'user-pi' } },
      'evt_processed',
    );

    const result = await processStripeWebhookEventIdempotently(db, event);

    expect(result).toEqual({ action: 'skip', reason: 'processed' });
    expect(setCalls).toHaveLength(0);
    expect(mocks.getUserById).not.toHaveBeenCalled();
  });
});
