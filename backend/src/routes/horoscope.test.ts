import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mocks = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockGetOrCreateDailyHoroscope: vi.fn(),
}));

vi.mock('../db/client', () => ({
  getDb: mocks.mockGetDb,
}));

vi.mock('../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('userId', 'user-1');
    await next();
  },
  requireUserId: (c: any) => c.get('userId'),
}));

vi.mock('../services/horoscopeService', () => ({
  getOrCreateDailyHoroscope: mocks.mockGetOrCreateDailyHoroscope,
}));

import horoscopeRoutes, { dailyHoroscopeCacheKey } from './horoscope';

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/horoscope', horoscopeRoutes);
  return app;
}

function selectResult(value: unknown) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        get: vi.fn(async () => value),
      })),
    })),
  };
}

const mockEnv = { horoscope_db: {} } as any;

describe('horoscope routes', () => {
  let cacheStore: Map<string, Response>;
  let waitUntilPromises: Promise<unknown>[];
  let executionCtx: { waitUntil: ReturnType<typeof vi.fn> };
  let mockCache: {
    match: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T16:30:00.000Z'));
    vi.clearAllMocks();
    cacheStore = new Map();
    waitUntilPromises = [];
    executionCtx = {
      waitUntil: vi.fn((promise: Promise<unknown>) => {
        waitUntilPromises.push(Promise.resolve(promise));
      }),
    };
    mockCache = {
      match: vi.fn(async (request: Request) => cacheStore.get(request.url)?.clone()),
      put: vi.fn(async (request: Request, response: Response) => {
        cacheStore.set(request.url, response.clone());
      }),
    };
    vi.stubGlobal('caches', { default: mockCache });
    mocks.mockGetOrCreateDailyHoroscope.mockResolvedValue({
      sign: 'aries',
      date: '2026-05-20',
      lang: 'en',
      overall: 'overall',
      love: 'love',
      career: 'career',
      health: 'health',
      luckyNumber: 7,
      luckyColor: 'blue',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('populates the edge cache on a public daily horoscope cache miss', async () => {
    const db = {};
    mocks.mockGetDb.mockReturnValue(db);

    const app = createApp();
    const res = await app.request(
      '/api/horoscope/daily/aries?date=2026-05-20&lang=en',
      {},
      mockEnv,
      executionCtx as any,
    );
    await Promise.all(waitUntilPromises);

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=21600');
    expect(mocks.mockGetOrCreateDailyHoroscope).toHaveBeenCalledWith(
      db,
      'aries',
      'en',
      '2026-05-20',
    );
    expect(mockCache.put).toHaveBeenCalledTimes(1);
    const cached = cacheStore.get(
      dailyHoroscopeCacheKey('aries', '2026-05-20', 'en').url,
    );
    expect(await cached?.json()).toMatchObject({
      sign: 'aries',
      date: '2026-05-20',
      lang: 'en',
    });
  });

  it('returns a public daily horoscope cache hit without calling the DB or service', async () => {
    cacheStore.set(
      dailyHoroscopeCacheKey('aries', '2026-05-20', 'en').url,
      Response.json({
        sign: 'aries',
        date: '2026-05-20',
        lang: 'en',
        overall: 'cached',
        love: 'cached',
        career: 'cached',
        health: 'cached',
        luckyNumber: 1,
        luckyColor: 'gold',
      }),
    );

    const app = createApp();
    const res = await app.request(
      '/api/horoscope/daily/aries?date=2026-05-20&lang=en',
      {},
      mockEnv,
      executionCtx as any,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ overall: 'cached' });
    expect(mocks.mockGetDb).not.toHaveBeenCalled();
    expect(mocks.mockGetOrCreateDailyHoroscope).not.toHaveBeenCalled();
    expect(mockCache.put).not.toHaveBeenCalled();
  });

  it('uses different cache keys for different zodiac signs and dates', () => {
    const ariesToday = dailyHoroscopeCacheKey('aries', '2026-05-20', 'en').url;
    const taurusToday = dailyHoroscopeCacheKey('taurus', '2026-05-20', 'en').url;
    const ariesTomorrow = dailyHoroscopeCacheKey('aries', '2026-05-21', 'en').url;

    expect(ariesToday).not.toBe(taurusToday);
    expect(ariesToday).not.toBe(ariesTomorrow);
  });

  it('does not cache non-200 public daily horoscope responses', async () => {
    const app = createApp();
    const res = await app.request(
      '/api/horoscope/daily/not-a-sign?date=2026-05-20&lang=en',
      {},
      mockEnv,
      executionCtx as any,
    );

    expect(res.status).toBe(400);
    expect(mockCache.put).not.toHaveBeenCalled();
  });

  it('derives authenticated today from profile timezone and ignores client date query', async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectResult({ sunSign: 'aries', moonSign: 'leo', risingSign: 'libra' }))
        .mockReturnValueOnce(selectResult({ timezone: 'Asia/Ulaanbaatar' })),
    };
    mocks.mockGetDb.mockReturnValue(db);

    const app = createApp();
    const res = await app.request(
      '/api/horoscope/daily?date=1999-01-01',
      { headers: { Authorization: 'Bearer token' } },
      mockEnv,
    );

    expect(res.status).toBe(200);
    expect(mocks.mockGetOrCreateDailyHoroscope).toHaveBeenCalledWith(
      db,
      'aries',
      'en',
      '2026-05-20',
    );
  });
});
