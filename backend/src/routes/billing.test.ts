import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mocks = vi.hoisted(() => ({
  mockCreateCheckoutSession: vi.fn(),
  mockCreateStripeClient: vi.fn(),
  mockSyncPremiumFromCheckoutSession: vi.fn(),
  mockProcessRevenueCatWebhook: vi.fn(),
  mockSyncPremiumFromRevenueCatApi: vi.fn(),
  mockVerifyRevenueCatWebhookAuthorization: vi.fn(),
}));

vi.mock('../db/client', () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock('../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('userId', 'user-1');
    c.set('userEmail', 'user@example.com');
    await next();
  },
  requireUserId: (c: any) => c.get('userId'),
}));

vi.mock('../services/authService', () => ({
  getUserById: vi.fn(),
}));

vi.mock('../services/billingService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/billingService')>();
  return {
    ...actual,
    createStripeClient: mocks.mockCreateStripeClient,
    createPremiumCheckoutSession: mocks.mockCreateCheckoutSession,
    syncPremiumFromCheckoutSession: mocks.mockSyncPremiumFromCheckoutSession,
  };
});

vi.mock('../services/revenueCatService', () => ({
  processRevenueCatWebhook: mocks.mockProcessRevenueCatWebhook,
  syncPremiumFromRevenueCatApi: mocks.mockSyncPremiumFromRevenueCatApi,
  verifyRevenueCatWebhookAuthorization: mocks.mockVerifyRevenueCatWebhookAuthorization,
}));

import billingRoutes from './billing';

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/billing', billingRoutes);
  return app;
}

const baseEnv = {
  horoscope_db: {},
  APP_PUBLIC_URL: 'http://localhost:5173',
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_PRICE_ID: 'price_123',
} as any;

describe('billing routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockCreateStripeClient.mockReturnValue({ stripe: true });
    mocks.mockCreateCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay' });
    mocks.mockSyncPremiumFromCheckoutSession.mockResolvedValue({ isPremium: true });
    mocks.mockVerifyRevenueCatWebhookAuthorization.mockReturnValue(true);
    mocks.mockProcessRevenueCatWebhook.mockResolvedValue({ isPremium: true, action: 'grant' });
    mocks.mockSyncPremiumFromRevenueCatApi.mockResolvedValue({ isPremium: true, source: 'revenuecat_api' });
  });

  it('starts web checkout without requiring the webhook signing secret', async () => {
    const app = createApp();

    const res = await app.request(
      '/api/billing/create-checkout-session',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
      },
      baseEnv,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: 'https://checkout.stripe.com/c/pay' });
    expect(mocks.mockCreateCheckoutSession).toHaveBeenCalledWith(
      { stripe: true },
      'price_123',
      'user-1',
      'user@example.com',
      'http://localhost:5173',
    );
  });

  it('still requires webhook signing secret for webhook processing', async () => {
    const app = createApp();

    const res = await app.request(
      '/api/billing/webhook',
      {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      },
      baseEnv,
    );

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: 'Billing is not configured' });
  });

  it('syncs web checkout without requiring the webhook signing secret', async () => {
    const app = createApp();

    const res = await app.request(
      '/api/billing/checkout/sync',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'cs_test_123' }),
      },
      baseEnv,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ isPremium: true });
    expect(mocks.mockSyncPremiumFromCheckoutSession).toHaveBeenCalledWith(
      { stripe: true },
      {},
      'cs_test_123',
      'user-1',
    );
  });

  it('rejects checkout sync without a session id', async () => {
    const app = createApp();

    const res = await app.request(
      '/api/billing/checkout/sync',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      baseEnv,
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'sessionId is required' });
    expect(mocks.mockSyncPremiumFromCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects RevenueCat webhook when billing is not configured', async () => {
    const app = createApp();

    const res = await app.request(
      '/api/billing/revenuecat/webhook',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer rc-secret' },
        body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'user-1' } }),
      },
      baseEnv,
    );

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: 'RevenueCat webhook is not configured. Set REVENUECAT_WEBHOOK_SECRET.',
    });
  });

  it('rejects RevenueCat sync when API key is not configured', async () => {
    const app = createApp();

    const res = await app.request(
      '/api/billing/revenuecat/sync',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
      },
      baseEnv,
    );

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: 'RevenueCat sync is not configured. Set REVENUECAT_API_KEY.',
    });
    expect(mocks.mockSyncPremiumFromRevenueCatApi).not.toHaveBeenCalled();
  });

  it('processes RevenueCat webhook with valid authorization', async () => {
    const app = createApp();
    const env = { ...baseEnv, REVENUECAT_WEBHOOK_SECRET: 'rc-secret', REVENUECAT_API_KEY: 'rc-api' };

    const res = await app.request(
      '/api/billing/revenuecat/webhook',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer rc-secret', 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'user-1' } }),
      },
      env,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ received: true, isPremium: true });
    expect(mocks.mockVerifyRevenueCatWebhookAuthorization).toHaveBeenCalledWith(
      'Bearer rc-secret',
      'rc-secret',
    );
    expect(mocks.mockProcessRevenueCatWebhook).toHaveBeenCalled();
  });

  it('syncs premium from RevenueCat API for authenticated users', async () => {
    const app = createApp();
    const env = { ...baseEnv, REVENUECAT_API_KEY: 'rc-api' };

    const res = await app.request(
      '/api/billing/revenuecat/sync',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
      },
      env,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ isPremium: true, source: 'revenuecat_api' });
    expect(mocks.mockSyncPremiumFromRevenueCatApi).toHaveBeenCalledWith({}, 'rc-api', 'user-1');
  });
});
