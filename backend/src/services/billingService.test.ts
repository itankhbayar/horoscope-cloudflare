import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { stripeEvent } from '../test/stripeFixtures';
import { createDbCapture } from '../test/mockDb';
import {
  claimStripeWebhookEvent,
  grantPremiumFromCheckoutSession,
  grantPremiumFromPaymentIntent,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  processStripeWebhookEvent,
  revokePremiumFromSubscription,
  syncPremiumFromSubscription,
} from './billingService';

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
}));

vi.mock('./authService', () => ({
  getUserById: mocks.getUserById,
}));

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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db, setCalls } = createDbCapture();

    await grantPremiumFromCheckoutSession(db, {
      id: 'cs_test',
      metadata: {},
      customer: 'cus_abc',
    } as unknown as Stripe.Checkout.Session);

    expect(setCalls).toHaveLength(0);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('skips update when user is unknown', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db, setCalls } = createDbCapture();
    mocks.getUserById.mockResolvedValue(null);

    await grantPremiumFromCheckoutSession(db, {
      id: 'cs_test',
      metadata: { userId: 'missing-user' },
    } as unknown as Stripe.Checkout.Session);

    expect(setCalls).toHaveLength(0);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db, setCalls } = createDbCapture();

    await syncPremiumFromSubscription(db, {
      id: 'sub_orphan',
      status: 'active',
      metadata: {},
      customer: 'cus_unknown',
    } as unknown as Stripe.Subscription);

    expect(setCalls).toHaveLength(0);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db } = createDbCapture();

    await expect(
      handleInvoicePaymentFailed(db, {
        id: 'in_fail',
        customer: 'cus_fail',
        subscription: 'sub_fail',
      } as Stripe.Invoice),
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      '[billing] invoice.payment_failed',
      expect.objectContaining({ invoiceId: 'in_fail', customerId: 'cus_fail' }),
    );
    consoleError.mockRestore();
  });
});

describe('grantPremiumFromPaymentIntent', () => {
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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
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
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
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
    const claimed = await claimStripeWebhookEvent(db, 'evt_unique');
    expect(claimed).toBe(true);
  });
});
