import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mocks = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockGetOrCreateDailyHoroscope: vi.fn(),
  mockPersonalizeDailyHoroscope: vi.fn((horoscope: unknown) => horoscope),
  mockGetCurrentStreakData: vi.fn(),
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
  personalizeDailyHoroscope: mocks.mockPersonalizeDailyHoroscope,
}));

vi.mock('../services/streakService', () => ({
  getCurrentStreakData: mocks.mockGetCurrentStreakData,
}));

import horoscopeRoutes, { dailyHoroscopeCacheKey, globalSkyCacheKey, personalSkyCacheKey } from './horoscope';

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
    mocks.mockPersonalizeDailyHoroscope.mockImplementation((horoscope: unknown) => horoscope);
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
    mocks.mockGetCurrentStreakData.mockResolvedValue({
      streakCount: 0,
      longestStreakCount: 0,
      streakLastDate: null,
      streakFreezes: 0,
      streakFreezeAwarded: false,
      streakFreezeCap: 1,
      streakFreezeAwardReason: null,
      isNewStreakDay: false,
      streakPreservedByFreeze: false,
      milestoneReached: null,
      nextMilestone: 3,
      streakSegment: 'new',
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
    expect(mocks.mockGetCurrentStreakData).not.toHaveBeenCalled();
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

  it('returns and caches a public global sky feed without auth or DB access', async () => {
    const app = createApp();
    const res = await app.request('/api/horoscope/global-sky?date=2026-05-20&lang=en', {}, mockEnv, executionCtx as any);
    await Promise.all(waitUntilPromises);

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=21600');
    const body = await res.json() as any;
    expect(body).toMatchObject({
      date: '2026-05-20',
      moonPhase: expect.any(String),
      atmosphere: expect.any(Object),
      cards: expect.any(Array),
    });
    expect(mocks.mockGetDb).not.toHaveBeenCalled();
    expect(mockCache.put).toHaveBeenCalledTimes(1);
    expect(cacheStore.get(globalSkyCacheKey('2026-05-20', 'en').url)).toBeDefined();
  });

  it('returns and caches a public personal sky layer from sign only', async () => {
    const app = createApp();
    const res = await app.request('/api/horoscope/personal-sky?sign=scorpio&date=2026-05-20&lang=en', {}, mockEnv, executionCtx as any);
    await Promise.all(waitUntilPromises);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toMatchObject({
      date: '2026-05-20',
      sign: 'scorpio',
      personalization: 'zodiac_sign',
      ritualCards: expect.any(Array),
      sky: expect.objectContaining({ atmosphere: expect.any(Object) }),
    });
    expect(JSON.stringify(body)).not.toMatch(/birthCity|birthTime|email|userId|latitude|longitude/i);
    expect(mocks.mockGetDb).not.toHaveBeenCalled();
    expect(cacheStore.get(personalSkyCacheKey('scorpio', '2026-05-20', 'en').url)).toBeDefined();
  });

  it('requires exactly one lightweight personalization input', async () => {
    const app = createApp();
    const missing = await app.request('/api/horoscope/personal-sky?date=2026-05-20', {}, mockEnv, executionCtx as any);
    const both = await app.request('/api/horoscope/personal-sky?sign=scorpio&birthDate=1990-01-05&date=2026-05-20', {}, mockEnv, executionCtx as any);

    expect(missing.status).toBe(400);
    expect(both.status).toBe(400);
    expect(mockCache.put).not.toHaveBeenCalled();
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
    expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(mocks.mockGetOrCreateDailyHoroscope).toHaveBeenCalledWith(
      db,
      'aries',
      'en',
      '2026-05-20',
    );
    expect(mocks.mockPersonalizeDailyHoroscope).toHaveBeenCalledWith(
      expect.objectContaining({ sign: 'aries' }),
      expect.objectContaining({
        sunSign: 'aries',
        moonSign: 'leo',
        risingSign: 'libra',
      }),
    );
    expect(mocks.mockGetCurrentStreakData).toHaveBeenCalledWith(db, 'user-1');
    expect(mockCache.match).not.toHaveBeenCalled();
    expect(mockCache.put).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toMatchObject({
      streakCount: 0,
      longestStreakCount: 0,
      streakLastDate: null,
      streakFreezes: 0,
      streakFreezeAwarded: false,
      streakFreezeCap: 1,
      streakFreezeAwardReason: null,
      isNewStreakDay: false,
      streakPreservedByFreeze: false,
      milestoneReached: null,
      nextMilestone: 3,
      streakSegment: 'new',
    });
  });

  it('does not run streak updates for anonymous daily horoscope reads', async () => {
    const db = {};
    mocks.mockGetDb.mockReturnValue(db);

    const app = createApp();
    const res = await app.request('/api/horoscope/daily/aries?date=2026-05-20', {}, mockEnv, executionCtx as any);

    expect(res.status).toBe(200);
    expect(mocks.mockGetCurrentStreakData).not.toHaveBeenCalled();
  });

  it('returns current streak state without mutating it for timezone-shifted profiles', async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectResult({ sunSign: 'aries', moonSign: 'leo', risingSign: 'libra' }))
        .mockReturnValueOnce(selectResult({ timezone: 'Pacific/Kiritimati' })),
    };
    mocks.mockGetDb.mockReturnValue(db);

    const app = createApp();
    const res = await app.request('/api/horoscope/daily', { headers: { Authorization: 'Bearer token' } }, mockEnv);

    expect(res.status).toBe(200);
    expect(mocks.mockGetOrCreateDailyHoroscope).toHaveBeenCalledWith(
      db,
      'aries',
      'en',
      '2026-05-20',
    );
    expect(mocks.mockGetCurrentStreakData).toHaveBeenCalledWith(db, 'user-1');
  });
});
