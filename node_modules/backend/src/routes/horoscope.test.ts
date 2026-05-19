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

import horoscopeRoutes from './horoscope';

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
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T16:30:00.000Z'));
    vi.clearAllMocks();
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
    vi.useRealTimers();
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
