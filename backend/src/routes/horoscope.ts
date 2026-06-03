import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { createRateLimitMiddleware } from '../middleware/rateLimit';
import { consumeLegacyUpgradeRunState, getOrCreateDailyHoroscope, personalizeDailyHoroscope } from '../services/horoscopeService';
import { buildGlobalSkyToday } from '../services/globalSkyService';
import { buildPersonalSkyLayer } from '../services/personalSkyService';
import type { NatalChartData } from '../services/astrologyService';
import { getCurrentStreakData } from '../services/streakService';
import { buildPatternMemoryForUser } from '../services/themeMemoryService';
import { hasActivePremiumEntitlement } from '../middleware/premium';
import { isZodiacSign, ZODIAC_SIGNS, type ZodiacSign } from '../utils/zodiac';
import { natalCharts, users } from '../db/schema';
import { searchCities } from '../utils/cities';
import { parseLang } from '../utils/lang';
import { safeDateISO } from '../utils/localDate';
import type { AppBindings, AppVariables } from '../types';
import { metric } from '../utils/logger';
import { citySearchQuerySchema, dailyHoroscopeParamsSchema, dailyHoroscopeQuerySchema, personalSkyQuerySchema } from '../schemas/horoscope';
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

function wordCount(text: string | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function summarizeBlocks(blocks: unknown): Array<{ id: string; paragraphCount: number; wordCount: number }> {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((b: any) => ({
    id: String(b?.id ?? 'unknown'),
    paragraphCount: Array.isArray(b?.paragraphs) ? b.paragraphs.length : 0,
    wordCount: Array.isArray(b?.paragraphs)
      ? b.paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length
      : 0,
  }));
}

export function dailyHoroscopeCacheKey(sign: ZodiacSign, dateISO: string, lang: string): Request {
  const url = new URL('/api/horoscope/daily', DAILY_HOROSCOPE_CACHE_ORIGIN);
  url.searchParams.set('sign', sign);
  url.searchParams.set('date', dateISO);
  url.searchParams.set('lang', lang);
  url.searchParams.set('variant', 'free-v2');
  return new Request(url.toString(), { method: 'GET' });
}

export function globalSkyCacheKey(dateISO: string, lang: string): Request {
  const url = new URL('/api/horoscope/global-sky', DAILY_HOROSCOPE_CACHE_ORIGIN);
  url.searchParams.set('date', dateISO);
  url.searchParams.set('lang', lang);
  return new Request(url.toString(), { method: 'GET' });
}

export function personalSkyCacheKey(signOrBirthDate: string, dateISO: string, lang: string): Request {
  const url = new URL('/api/horoscope/personal-sky', DAILY_HOROSCOPE_CACHE_ORIGIN);
  url.searchParams.set('input', signOrBirthDate);
  url.searchParams.set('date', dateISO);
  url.searchParams.set('lang', lang);
  return new Request(url.toString(), { method: 'GET' });
}

router.get('/signs', publicRateLimit, (c) => ok(c, ZODIAC_SIGNS));

router.get('/global-sky', publicRateLimit, async (c) => {
  const query = parseQuery(c, dailyHoroscopeQuerySchema);
  if (isResponse(query)) return query;
  const dateISO = query.date ?? safeDateISO('UTC');
  const lang = parseLang(query.lang ?? c.req.header('Accept-Language'));
  const cache = caches.default;
  const cacheKey = globalSkyCacheKey(dateISO, lang);
  const cached = await cache.match(cacheKey);
  if (cached) {
    metric(c.env, 'global_sky_cache_hit', { lang });
    return cached;
  }

  const sky = buildGlobalSkyToday(dateISO);
  metric(c.env, 'global_sky_viewed', { lang });
  const response = ok(c, sky);
  response.headers.set('Cache-Control', DAILY_HOROSCOPE_CACHE_CONTROL);
  if (response.status === 200) {
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
});

router.get('/personal-sky', publicRateLimit, async (c) => {
  const query = parseQuery(c, personalSkyQuerySchema);
  if (isResponse(query)) return query;
  const dateISO = query.date ?? safeDateISO('UTC');
  const lang = parseLang(query.lang ?? c.req.header('Accept-Language'));
  const inputKey = query.sign ?? query.birthDate!;
  const cache = caches.default;
  const cacheKey = personalSkyCacheKey(inputKey, dateISO, lang);
  const cached = await cache.match(cacheKey);
  if (cached) {
    metric(c.env, 'personal_sky_cache_hit', { lang });
    return cached;
  }

  const personalSky = buildPersonalSkyLayer(query.sign ? { sign: query.sign } : { birthDate: query.birthDate! }, dateISO);
  metric(c.env, 'personal_sky_viewed', { lang, personalization: personalSky.personalization, sign: personalSky.sign });
  const response = ok(c, personalSky);
  response.headers.set('Cache-Control', DAILY_HOROSCOPE_CACHE_CONTROL);
  if (response.status === 200) {
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
});

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
  const upgraded = consumeLegacyUpgradeRunState(sign, lang, dateISO);
  // Temporary runtime diagnostics for MN depth rollout.
  // eslint-disable-next-line no-console
  console.log('[daily-horoscope-response]', {
    route: 'public',
    lang,
    sign,
    date: dateISO,
    hasBlocks: Array.isArray((horoscope as any).blocks),
    blockCount: Array.isArray((horoscope as any).blocks) ? (horoscope as any).blocks.length : 0,
    blocks: summarizeBlocks((horoscope as any).blocks),
    sectionWordCounts: {
      overall: wordCount(horoscope.overall),
      love: wordCount(horoscope.love),
      career: wordCount(horoscope.career),
      health: wordCount(horoscope.health),
      finance: wordCount((horoscope as any).finance),
      advice: wordCount((horoscope as any).advice),
    },
    legacyUpgradeRan: upgraded,
  });
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
    .select({ timezone: users.timezone, isPremium: users.isPremium })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  const dateISO = safeDateISO(user?.timezone ?? 'UTC');
  const baseHoroscope = await getOrCreateDailyHoroscope(db, chart.sunSign as ZodiacSign, lang, dateISO);
  const upgraded = consumeLegacyUpgradeRunState(chart.sunSign as ZodiacSign, lang, dateISO);
  const horoscope = personalizeDailyHoroscope(baseHoroscope, {
    sunSign: chart.sunSign as ZodiacSign,
    moonSign: chart.moonSign as ZodiacSign,
    risingSign: chart.risingSign as ZodiacSign | null,
    planets: chart.planets as NatalChartData['planets'],
    houses: chart.houses as NatalChartData['houses'],
    aspects: chart.aspects as NatalChartData['aspects'],
  });
  const streak = await getCurrentStreakData(db, userId);

  // Premium Pattern Memory: deterministic, premium-only, reuses today's hook theme.
  // Never allowed to break the reading — any failure simply omits the section.
  let patternMemory = null;
  if (horoscope.hookTheme) {
    try {
      patternMemory = await buildPatternMemoryForUser(db, {
        userId,
        isPremium: hasActivePremiumEntitlement(user),
        todayISO: dateISO,
        theme: horoscope.hookTheme,
        lang,
      });
    } catch {
      patternMemory = null;
    }
  }
  if (patternMemory) {
    // Generation-time content signal only. The user-facing impression is counted once,
    // client-side, by `pattern_memory_shown` when the card actually renders — the backend
    // must not emit an impression event here or every API call (refresh, period switch,
    // prefetch) would double-count against the real impression.
    metric(c.env, 'pattern_memory_repeat_theme', {
      theme: patternMemory.theme,
      occurrences: patternMemory.occurrences,
      kind: patternMemory.kind,
    });
  }

  metric(c.env, 'horoscope_viewed', { sign: chart.sunSign, lang, variant: 'authenticated' });
  // Temporary runtime diagnostics for MN depth rollout.
  // eslint-disable-next-line no-console
  console.log('[daily-horoscope-response]', {
    route: 'authenticated',
    lang,
    sign: chart.sunSign,
    date: dateISO,
    hasBlocks: Array.isArray((horoscope as any).blocks),
    blockCount: Array.isArray((horoscope as any).blocks) ? (horoscope as any).blocks.length : 0,
    blocks: summarizeBlocks((horoscope as any).blocks),
    sectionWordCounts: {
      overall: wordCount(horoscope.overall),
      love: wordCount(horoscope.love),
      career: wordCount(horoscope.career),
      health: wordCount(horoscope.health),
      finance: wordCount((horoscope as any).finance),
      advice: wordCount((horoscope as any).advice),
    },
    legacyUpgradeRan: upgraded,
  });
  const response = ok(c, {
    ...horoscope,
    sunSign: chart.sunSign,
    moonSign: chart.moonSign,
    risingSign: chart.risingSign,
    ...streak,
    patternMemory,
  });
  return response;
});

export default router;
