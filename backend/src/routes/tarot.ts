import { Hono } from 'hono';
import { getDb } from '../db/client';
import { authMiddleware } from '../middleware/auth';
import { requirePremium } from '../middleware/premium';
import { createRateLimitMiddleware } from '../middleware/rateLimit';
import { parseTarotQueryParams } from '../tarot/tarotQuery';
import { getCachedTarotDaily } from '../services/tarotService';
import { drawRandomCard } from '../tarot/tarotDraw';
import { parseLang } from '../utils/lang';
import type { AppBindings, AppVariables } from '../types';
import { tarotQuerySchema } from '../schemas/tarot';
import { parseQuery, isResponse } from '../validators/request';
import { fail, ok } from '../utils/apiResponse';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
const premiumReadRateLimit = createRateLimitMiddleware({
  keyPrefix: 'premium:tarot',
  limit: 120,
  windowMs: 60_000,
  binding: 'PUBLIC_RATE_LIMITER',
  scope: 'user',
});

router.get('/', authMiddleware, premiumReadRateLimit, requirePremium, async (c) => {
  const query = parseQuery(c, tarotQuerySchema);
  if (isResponse(query)) return query;
  const parsed = parseTarotQueryParams(query.sign, query.timezone, query.date);
  if (!parsed.ok) {
    return fail(c, 400, 'BAD_REQUEST', parsed.error);
  }

  const lang = parseLang(query.lang ?? c.req.header('Accept-Language'));
  const db = getDb(c.env.horoscope_db);
  const result = await getCachedTarotDaily(db, parsed.sign, parsed.timezone, parsed.date, lang);

  if (result.status === 404) {
    return fail(c, 404, 'NOT_FOUND', 'Tarot reading not found', result.body);
  }
  if (result.status === 503) {
    return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Tarot reading unavailable', result.body);
  }
  return ok(c, result.body);
});

/**
 * Free-draw: a fresh random card on every press ("ask the cards"). Not cached or
 * persisted, and not tied to a sign or date — same premium gating as the daily card.
 */
router.get('/draw', authMiddleware, premiumReadRateLimit, requirePremium, (c) => {
  const lang = parseLang(c.req.query('lang') ?? c.req.header('Accept-Language'));
  return ok(c, { card: drawRandomCard(lang) });
});

export default router;
