import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRateLimitMiddleware, resetRateLimitTestState } from './rateLimit';
import type { AppBindings, AppVariables } from '../types';

function fakeRateLimit(limit: number): RateLimit {
  const counts = new Map<string, number>();
  return {
    async limit({ key }) {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return { success: next <= limit };
    },
  };
}

function appWithLimiter(scope: 'ip' | 'user' = 'ip'): Hono<{ Bindings: AppBindings; Variables: AppVariables }> {
  const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
  app.use(
    '/limited',
    async (c, next) => {
      if (scope === 'user') c.set('userId', c.req.header('X-User-ID') ?? '');
      await next();
    },
    createRateLimitMiddleware({
      keyPrefix: 'test:limited',
      limit: 2,
      windowMs: 60_000,
      binding: 'PUBLIC_RATE_LIMITER',
      scope,
    }),
  );
  app.get('/limited', (c) => c.text('ok'));
  return app;
}

describe('distributed rate limit middleware', () => {
  beforeEach(() => {
    resetRateLimitTestState();
  });

  it('uses Cloudflare Rate Limiting binding state across app instances', async () => {
    const env = { PUBLIC_RATE_LIMITER: fakeRateLimit(2), APP_ENV: 'production' } as AppBindings;
    const appA = appWithLimiter();
    const appB = appWithLimiter();
    const init = { headers: { 'CF-Connecting-IP': '203.0.113.50' } };

    expect((await appA.request('/limited', init, env)).status).toBe(200);
    expect((await appB.request('/limited', init, env)).status).toBe(200);
    const limited = await appA.request('/limited', init, env);

    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('60');
    await expect(limited.json()).resolves.toEqual({ error: 'Too many requests, please try again later' });
  });

  it('supports per-user keys when a user id is available', async () => {
    const env = { PUBLIC_RATE_LIMITER: fakeRateLimit(2), APP_ENV: 'production' } as AppBindings;
    const app = appWithLimiter('user');

    for (let i = 0; i < 2; i += 1) {
      expect((await app.request('/limited', { headers: { 'X-User-ID': 'user-a' } }, env)).status).toBe(200);
    }

    expect((await app.request('/limited', { headers: { 'X-User-ID': 'user-a' } }, env)).status).toBe(429);
    expect((await app.request('/limited', { headers: { 'X-User-ID': 'user-b' } }, env)).status).toBe(200);
  });

  it('fails closed in production when no distributed backend is configured', async () => {
    const app = appWithLimiter();
    const res = await app.request('/limited', undefined, { APP_ENV: 'production' } as AppBindings);

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: 'Rate limit backend is not configured' });
  });
});
