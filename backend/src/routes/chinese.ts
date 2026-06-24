import { Hono, type Context } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { requirePremium } from '../middleware/premium';
import { createRateLimitMiddleware } from '../middleware/rateLimit';
import {
  getOrCreateChineseDaily,
  getOrCreateChinesePeriod,
} from '../services/chineseHoroscopeService';
import { computeChineseCompatibility } from '../services/chineseCompatibilityService';
import { currentPeriodKey, PERIOD_KEY_PATTERNS } from '../services/periodHoroscopeService';
import type { PeriodType } from '../services/claudeHoroscopeService';
import {
  CHINESE_ANIMALS,
  getChineseProfile,
  type ChineseAnimal,
} from '../utils/chineseZodiac';
import { birthProfiles } from '../db/schema';
import { parseLang } from '../utils/lang';
import { safeDateISO } from '../utils/localDate';
import type { AppBindings, AppVariables } from '../types';
import { metric } from '../utils/logger';
import {
  chineseCompatibilityQuerySchema,
  chineseCompatibilitySchema,
  chineseDailyParamsSchema,
  chineseDailyQuerySchema,
  chinesePeriodQuerySchema,
  chineseProfilePreviewQuerySchema,
} from '../schemas/chinese';
import { parseParams, parseQuery, parseJsonBody, isResponse } from '../validators/request';
import { fail, ok } from '../utils/apiResponse';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

const CACHE_TTL_SECONDS = 60 * 60 * 6;
const CACHE_CONTROL = `public, max-age=300, s-maxage=${CACHE_TTL_SECONDS}`;
const CACHE_ORIGIN = 'https://horoscope-cache.local';

const publicRateLimit = createRateLimitMiddleware({
  keyPrefix: 'public:chinese',
  limit: 120,
  windowMs: 60_000,
  binding: 'PUBLIC_RATE_LIMITER',
});
const premiumWriteRateLimit = createRateLimitMiddleware({
  keyPrefix: 'premium:chinese-compatibility',
  limit: 60,
  windowMs: 60_000,
  binding: 'PUBLIC_RATE_LIMITER',
  scope: 'user',
});

export function chineseDailyCacheKey(animal: ChineseAnimal, dateISO: string, lang: string): Request {
  const url = new URL('/api/chinese/daily', CACHE_ORIGIN);
  url.searchParams.set('animal', animal);
  url.searchParams.set('date', dateISO);
  url.searchParams.set('lang', lang);
  return new Request(url.toString(), { method: 'GET' });
}

router.get('/signs', publicRateLimit, (c) => ok(c, CHINESE_ANIMALS));

// Public: derive a Chinese-zodiac profile from any birth date (no account needed),
// so guests can find their animal before signing up.
router.get('/profile/preview', publicRateLimit, (c) => {
  const query = parseQuery(c, chineseProfilePreviewQuerySchema);
  if (isResponse(query)) return query;
  return ok(c, getChineseProfile(query.birthDate));
});

router.get('/daily/:animal', publicRateLimit, async (c) => {
  const params = parseParams(c, chineseDailyParamsSchema);
  if (isResponse(params)) return params;
  const query = parseQuery(c, chineseDailyQuerySchema);
  if (isResponse(query)) return query;
  const animal = params.animal;
  const dateISO = query.date ?? safeDateISO('UTC');
  const lang = parseLang(query.lang ?? c.req.header('Accept-Language'));

  const cache = caches.default;
  const cacheKey = chineseDailyCacheKey(animal, dateISO, lang);
  const cached = await cache.match(cacheKey);
  if (cached) {
    metric(c.env, 'chinese_daily_cache_hit', { animal, lang });
    return cached;
  }
  metric(c.env, 'chinese_daily_cache_miss', { animal, lang });

  const db = getDb(c.env.horoscope_db);
  const horoscope = await getOrCreateChineseDaily(db, animal, lang, dateISO);
  metric(c.env, 'chinese_horoscope_viewed', { animal, lang });
  const response = ok(c, horoscope);
  response.headers.set('Cache-Control', CACHE_CONTROL);
  if (response.status === 200) {
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
});

async function respondPeriod(
  c: Context<{ Bindings: AppBindings; Variables: AppVariables }>,
  periodType: PeriodType,
): Promise<Response> {
  const params = parseParams(c, chineseDailyParamsSchema);
  if (isResponse(params)) return params;
  const query = parseQuery(c, chinesePeriodQuerySchema);
  if (isResponse(query)) return query;
  const animal = params.animal;
  const lang = parseLang(query.lang ?? c.req.header('Accept-Language'));

  const expected = PERIOD_KEY_PATTERNS[periodType];
  const periodKey = query.period && expected.test(query.period)
    ? query.period
    : currentPeriodKey(periodType, 'UTC');

  const db = getDb(c.env.horoscope_db);
  const horoscope = await getOrCreateChinesePeriod(db, animal, periodType, periodKey, lang);
  metric(c.env, 'chinese_period_viewed', { animal, lang, periodType });
  const response = ok(c, horoscope);
  response.headers.set('Cache-Control', CACHE_CONTROL);
  return response;
}

router.get('/weekly/:animal', publicRateLimit, (c) => respondPeriod(c, 'weekly'));
router.get('/monthly/:animal', publicRateLimit, (c) => respondPeriod(c, 'monthly'));
router.get('/yearly/:animal', publicRateLimit, (c) => respondPeriod(c, 'yearly'));

router.post('/compatibility/signs', authMiddleware, premiumWriteRateLimit, requirePremium, async (c) => {
  const body = await parseJsonBody(c, chineseCompatibilitySchema);
  if (isResponse(body)) return body;
  const query = parseQuery(c, chineseCompatibilityQuerySchema);
  if (isResponse(query)) return query;
  const lang = parseLang(query.lang ?? c.req.header('Accept-Language'));
  const result = computeChineseCompatibility(body.animal1, body.animal2, lang);
  metric(c.env, 'chinese_compatibility_viewed', { lang });
  return ok(c, result);
});

router.get('/profile', authMiddleware, async (c) => {
  c.header('Cache-Control', 'private, no-store, max-age=0');
  const userId = requireUserId(c);
  const db = getDb(c.env.horoscope_db);
  const profile = await db
    .select({ birthDate: birthProfiles.birthDate })
    .from(birthProfiles)
    .where(eq(birthProfiles.userId, userId))
    .get();
  if (!profile?.birthDate) return fail(c, 404, 'NOT_FOUND', 'Birth profile not found');
  return ok(c, getChineseProfile(profile.birthDate));
});

export default router;
