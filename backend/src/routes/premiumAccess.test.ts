import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getCachedTarotDaily: vi.fn(),
  computeSignCompatibility: vi.fn(),
  compareUsers: vi.fn(),
  persistCompatibility: vi.fn(),
}));

vi.mock('../db/client', () => ({
  getDb: mocks.getDb,
}));

vi.mock('../services/tarotService', () => ({
  getCachedTarotDaily: mocks.getCachedTarotDaily,
}));

vi.mock('../services/compatibilityService', () => ({
  computeSignCompatibility: mocks.computeSignCompatibility,
  compareUsers: mocks.compareUsers,
  persistCompatibility: mocks.persistCompatibility,
}));

import { issueToken } from '../services/authService';
import compatibilityRoutes from './compatibility';
import horoscopeRoutes from './horoscope';
import tarotRoutes from './tarot';

const JWT_SECRET = 'test-secret';

function createSelectDb(row: unknown) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(async () => row),
        })),
      })),
    })),
  };
}

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/tarot', tarotRoutes);
  app.route('/api/compatibility', compatibilityRoutes);
  app.route('/api/horoscope', horoscopeRoutes);
  return app;
}

async function authHeader(userId = 'user-1'): Promise<Record<string, string>> {
  const token = await issueToken(JWT_SECRET, userId, `${userId}@example.com`);
  return { Authorization: `Bearer ${token}` };
}

const env = {
  horoscope_db: {},
  JWT_SECRET,
} as any;

describe('premium API access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCachedTarotDaily.mockResolvedValue({
      status: 200,
      body: { card_of_the_day: { name: 'The Star' }, reading: { overview: 'ok' } },
    });
    mocks.computeSignCompatibility.mockReturnValue({
      sign1: 'aries',
      sign2: 'leo',
      overallScore: 90,
      loveScore: 88,
      friendshipScore: 91,
      communicationScore: 83,
      summary: 'Bright match',
      highlights: ['Warmth'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 401 from auth middleware before premium checks when unauthenticated', async () => {
    const app = createApp();
    const res = await app.request('/api/tarot?sign=aries&timezone=UTC', {}, env);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('returns 403 for authenticated free users on premium endpoints', async () => {
    mocks.getDb.mockReturnValue(
      createSelectDb({ id: 'user-1', email: 'u@example.com', isPremium: false }),
    );
    const app = createApp();

    const res = await app.request(
      '/api/tarot?sign=aries&timezone=UTC',
      {
        headers: await authHeader(),
      },
      env,
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: 'Premium subscription required' });
    expect(mocks.getCachedTarotDaily).not.toHaveBeenCalled();
  });

  it('returns 200 for authenticated premium users on tarot and compatibility endpoints', async () => {
    mocks.getDb.mockReturnValue(
      createSelectDb({ id: 'user-1', email: 'u@example.com', isPremium: true }),
    );
    const headers = await authHeader();
    const app = createApp();

    const tarot = await app.request('/api/tarot?sign=aries&timezone=UTC', { headers }, env);
    const compatibility = await app.request(
      '/api/compatibility/signs',
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sign1: 'aries', sign2: 'leo' }),
      },
      env,
    );

    expect(tarot.status).toBe(200);
    expect(compatibility.status).toBe(200);
  });

  it.each([
    ['canceled', { isPremium: true, subscriptionStatus: 'canceled' }],
    ['unpaid', { isPremium: true, stripeSubscriptionStatus: 'unpaid' }],
    ['expired', { isPremium: true, premiumUntil: '2026-05-19T00:00:00.000Z' }],
  ])('returns 403 for %s premium state', async (_label, user) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T00:00:00.000Z'));
    mocks.getDb.mockReturnValue(
      createSelectDb({ id: 'user-1', email: 'u@example.com', ...user }),
    );
    const app = createApp();

    const res = await app.request(
      '/api/tarot?sign=aries&timezone=UTC',
      {
        headers: await authHeader(),
      },
      env,
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: 'Premium subscription required' });
  });

  it('leaves public free endpoints available without authentication', async () => {
    const app = createApp();
    const res = await app.request('/api/horoscope/signs', {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'aries' })]),
    );
  });
});
