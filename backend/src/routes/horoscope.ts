import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { getOrCreateDailyHoroscope } from '../services/horoscopeService';
import { isZodiacSign, ZODIAC_SIGNS, type ZodiacSign } from '../utils/zodiac';
import { natalCharts, users } from '../db/schema';
import { searchCities } from '../utils/cities';
import { parseLang } from '../utils/lang';
import { safeDateISO } from '../utils/localDate';
import type { AppBindings, AppVariables } from '../types';
import { metric } from '../utils/logger';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
const DAILY_HOROSCOPE_CACHE_TTL_SECONDS = 60 * 60 * 6;
const DAILY_HOROSCOPE_CACHE_CONTROL = `public, max-age=300, s-maxage=${DAILY_HOROSCOPE_CACHE_TTL_SECONDS}`;
const DAILY_HOROSCOPE_CACHE_ORIGIN = 'https://horoscope-cache.local';

export function dailyHoroscopeCacheKey(sign: ZodiacSign, dateISO: string, lang: string): Request {
  const url = new URL('/api/horoscope/daily', DAILY_HOROSCOPE_CACHE_ORIGIN);
  url.searchParams.set('sign', sign);
  url.searchParams.set('date', dateISO);
  url.searchParams.set('lang', lang);
  url.searchParams.set('variant', 'free');
  return new Request(url.toString(), { method: 'GET' });
}

router.get('/signs', (c) => c.json(ZODIAC_SIGNS));

router.get('/cities', (c) => {
  const q = c.req.query('q') ?? '';
  const limit = Math.min(parseInt(c.req.query('limit') ?? '10', 10) || 10, 25);
  return c.json(searchCities(q, limit));
});

router.get('/daily/:sign', async (c) => {
  const sign = c.req.param('sign').toLowerCase();
  if (!isZodiacSign(sign)) return c.json({ error: 'Unknown sign' }, 400);
  const dateISO = c.req.query('date') ?? safeDateISO('UTC');
  const lang = parseLang(c.req.query('lang') ?? c.req.header('Accept-Language'));
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
  const response = c.json(horoscope);
  response.headers.set('Cache-Control', DAILY_HOROSCOPE_CACHE_CONTROL);
  if (response.status === 200) {
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
});

router.get('/daily', authMiddleware, async (c) => {
  const userId = requireUserId(c);
  const lang = parseLang(c.req.query('lang') ?? c.req.header('Accept-Language'));
  const db = getDb(c.env.horoscope_db);
  const chart = await db.select().from(natalCharts).where(eq(natalCharts.userId, userId)).get();
  if (!chart) return c.json({ error: 'Natal chart not found' }, 404);
  const user = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  const dateISO = safeDateISO(user?.timezone ?? 'UTC');
  const horoscope = await getOrCreateDailyHoroscope(db, chart.sunSign as ZodiacSign, lang, dateISO);
  metric(c.env, 'horoscope_viewed', { sign: chart.sunSign, lang, variant: 'authenticated' });
  return c.json({
    ...horoscope,
    sunSign: chart.sunSign,
    moonSign: chart.moonSign,
    risingSign: chart.risingSign,
  });
});

export default router;
