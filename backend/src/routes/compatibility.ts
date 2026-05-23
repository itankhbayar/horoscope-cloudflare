import { Hono } from 'hono';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { requirePremium } from '../middleware/premium';
import { createRateLimitMiddleware } from '../middleware/rateLimit';
import {
  compareUsers,
  computeSignCompatibility,
  persistCompatibility,
} from '../services/compatibilityService';
import { isZodiacSign, type ZodiacSign } from '../utils/zodiac';
import { parseLang } from '../utils/lang';
import type { AppBindings, AppVariables } from '../types';
import { metric } from '../utils/logger';
import {
  compatibilityQuerySchema,
  compatibilitySignsSchema,
  compatibilityUsersSchema,
} from '../schemas/compatibility';
import { parseJsonBody, parseQuery, isResponse } from '../validators/request';
import { fail, ok } from '../utils/apiResponse';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
const premiumWriteRateLimit = createRateLimitMiddleware({
  keyPrefix: 'premium:compatibility',
  limit: 60,
  windowMs: 60_000,
  binding: 'PUBLIC_RATE_LIMITER',
  scope: 'user',
});

router.post('/signs', authMiddleware, premiumWriteRateLimit, requirePremium, async (c) => {
  const body = await parseJsonBody(c, compatibilitySignsSchema);
  if (isResponse(body)) return body;
  const { sign1, sign2, persist } = body;
  if (!isZodiacSign(sign1) || !isZodiacSign(sign2)) {
    return fail(c, 400, 'BAD_REQUEST', 'Invalid signs');
  }
  const query = parseQuery(c, compatibilityQuerySchema);
  if (isResponse(query)) return query;
  const lang = parseLang(query.lang ?? c.req.header('Accept-Language'));
  const result = computeSignCompatibility(sign1 as ZodiacSign, sign2 as ZodiacSign, lang);
  metric(c.env, 'compatibility_viewed', { mode: 'signs', lang });
  if (persist) {
    const db = getDb(c.env.horoscope_db);
    await persistCompatibility(db, result);
  }
  return ok(c, result);
});

router.post('/users', authMiddleware, premiumWriteRateLimit, requirePremium, async (c) => {
  const userId = requireUserId(c);
  const body = await parseJsonBody(c, compatibilityUsersSchema);
  if (isResponse(body)) return body;
  const query = parseQuery(c, compatibilityQuerySchema);
  if (isResponse(query)) return query;
  const lang = parseLang(query.lang ?? c.req.header('Accept-Language'));
  const db = getDb(c.env.horoscope_db);
  try {
    const result = await compareUsers(db, userId, body.otherUserId, lang);
    metric(c.env, 'compatibility_viewed', { mode: 'users', lang });
    if (body.persist) await persistCompatibility(db, result);
    return ok(c, result);
  } catch (err) {
    return fail(c, 400, 'BAD_REQUEST', (err as Error).message);
  }
});

export default router;
