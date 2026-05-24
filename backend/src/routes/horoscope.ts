import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { createRateLimitMiddleware } from '../middleware/rateLimit';
import { getOrCreateDailyHoroscope, personalizeDailyHoroscope } from '../services/horoscopeService';
import type { NatalChartData } from '../services/astrologyService';
import { currentStreakDateISO, recordDailyHoroscopeStreak } from '../services/streakService';
import { isZodiacSign, ZODIAC_SIGNS, type ZodiacSign } from '../utils/zodiac';
import { natalCharts, users } from '../db/schema';
import { searchCities } from '../utils/cities';
import { parseLang } from '../utils/lang';
import { safeDateISO } from '../utils/localDate';
import type { AppBindings, AppVariables } from '../types';
import { metric } from '../utils/logger';
import { citySearchQuerySchema, dailyHoroscopeParamsSchema, dailyHoroscopeQuerySchema } from '../schemas/horoscope';
import { paginateItems } from '../schemas/common';
import { parseParams, parseQuery, isResponse } from '../validators/request';
import { fail, ok } from '../utils/apiResponse';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
const DAILY_HOROSCOPE_CACHE_TTL_SECONDS = 60 * 60 * 6;
const DAILY_HOROSCOPE_CACHE_CONTROL = `public, max-age=300, s-maxage=${DAILY_HOROSCOPE_CACHE_TTL_SECONDS}`;
const AUTHENTICATED_DAILY_HOROSCOPE_CACHE_CONTROL = 'private, no-store, max-age=0';
const DAILY_HOROSCOPE_CACHE_ORIGIN = 'https://horoscope-cache.local';
const publicRateLimit = createRateLimitMiddleware({
  keyPrefix: 'public:horoscope',
  limit: 120,
  windowMs: 60_000,
  binding: 'PUBLIC_RATE_LIMITER',
});

export function dailyHoroscopeCacheKey(sign: ZodiacSign, dateISO: string, lang: string): Request {
  const url = new URL('/api/horoscope/daily', DAILY_HOROSCOPE_CACHE_ORIGIN);
  url.searchParams.set('sign', sign);
  url.searchParams.set('date', dateISO);
  url.searchParams.set('lang', lang);
  url.searchParams.set('variant', 'free');
  return new Request(url.toString(), { method: 'GET' });
}

router.get('/signs', publicRateLimit, (c) => ok(c, ZODIAC_SIGNS));

router.get('/cities', publicRateLimit, (c) => {
  const query = parseQuery(c, citySearchQuerySchema);
  if (isResponse(query)) return query;
  const items = searchCities(query.q, query.limit);
  if (!c.req.path.startsWith('/api/v1/')) return c.json(items);
  return ok(c, paginateItems(items, { page: query.page, limit: query.limit }, items.length));
});

router.get('/daily/:sign', publicRateLimit, async (c) => {
  const params = parseParams(c, dailyHoroscopeParamsSchema);
  if (isResponse(params)) return params;
  const query = parseQuery(c, dailyHoroscopeQuerySchema);
  if (isResponse(query)) return query;
  const sign = params.sign;
  if (!isZodiacSign(sign)) return fail(c, 400, 'BAD_REQUEST', 'Unknown sign');
  const dateISO = query.date ?? safeDateISO('UTC');
  const lang = parseLang(query.lang ?? c.req.header('Accept-Language'));
  const cache = caches.default;
  const cacheKey = dailyHoroscopeCacheKey(sign, dateISO, lang);
  const cached = await cache.match(cacheKey);
  if (cached) {
    metric(c.env, 'daily_horoscope_cache_hit', { sign, lang, variant: 'free' });
    return cached;
  }
  metric(c.env, 'daily_horoscope_cache_miss', { sign, lang, variant: 'free' });

  const db = getDb(c.env.horoscope_db);
  const horoscope = await getOrCreateDailyHoroscope(db, sign, lang, dateISO);
  metric(c.env, 'horoscope_viewed', { sign, lang, variant: 'free' });
  const response = ok(c, horoscope);
  response.headers.set('Cache-Control', DAILY_HOROSCOPE_CACHE_CONTROL);
  if (response.status === 200) {
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
});

router.get('/daily', authMiddleware, async (c) => {
  c.header('Cache-Control', AUTHENTICATED_DAILY_HOROSCOPE_CACHE_CONTROL);
  const userId = requireUserId(c);
  const query = parseQuery(c, dailyHoroscopeQuerySchema);
  if (isResponse(query)) return query;
  const lang = parseLang(query.lang ?? c.req.header('Accept-Language'));
  const db = getDb(c.env.horoscope_db);
  const chart = await db.select().from(natalCharts).where(eq(natalCharts.userId, userId)).get();
  if (!chart) return fail(c, 404, 'NOT_FOUND', 'Natal chart not found');
  const user = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  const dateISO = safeDateISO(user?.timezone ?? 'UTC');
  const baseHoroscope = await getOrCreateDailyHoroscope(db, chart.sunSign as ZodiacSign, lang, dateISO);
  const horoscope = personalizeDailyHoroscope(baseHoroscope, {
    sunSign: chart.sunSign as ZodiacSign,
    moonSign: chart.moonSign as ZodiacSign,
    risingSign: chart.risingSign as ZodiacSign | null,
    planets: chart.planets as NatalChartData['planets'],
    houses: chart.houses as NatalChartData['houses'],
    aspects: chart.aspects as NatalChartData['aspects'],
  });
  const streak = await recordDailyHoroscopeStreak(db, userId, currentStreakDateISO());
  for (const event of streak.analyticsEvents) {
    metric(c.env, event, {
      streakCount: streak.data.streakCount,
      milestone: streak.data.milestoneReached ?? undefined,
      freezes: streak.data.streakFreezes,
    });
  }
  metric(c.env, 'horoscope_viewed', { sign: chart.sunSign, lang, variant: 'authenticated' });
  const response = ok(c, {
    ...horoscope,
    sunSign: chart.sunSign,
    moonSign: chart.moonSign,
    risingSign: chart.risingSign,
    ...streak.data,
  });
  return response;
});

export default router;
