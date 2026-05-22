import { Hono } from 'hono';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { requirePremium } from '../middleware/premium';
import {
  compareUsers,
  computeSignCompatibility,
  persistCompatibility,
} from '../services/compatibilityService';
import { isZodiacSign, type ZodiacSign } from '../utils/zodiac';
import { parseLang } from '../utils/lang';
import type { AppBindings, AppVariables } from '../types';
import { metric } from '../utils/logger';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.post('/signs', authMiddleware, requirePremium, async (c) => {
  const { sign1, sign2, persist } = await c.req.json<{
    sign1: string;
    sign2: string;
    persist?: boolean;
  }>();
  if (!isZodiacSign(sign1) || !isZodiacSign(sign2)) {
    return c.json({ error: 'Invalid signs' }, 400);
  }
  const lang = parseLang(c.req.query('lang') ?? c.req.header('Accept-Language'));
  const result = computeSignCompatibility(sign1 as ZodiacSign, sign2 as ZodiacSign, lang);
  metric(c.env, 'compatibility_viewed', { mode: 'signs', lang });
  if (persist) {
    const db = getDb(c.env.horoscope_db);
    await persistCompatibility(db, result);
  }
  return c.json(result);
});

router.post('/users', authMiddleware, requirePremium, async (c) => {
  const userId = requireUserId(c);
  const body = await c.req.json<{ otherUserId: string; persist?: boolean }>();
  if (!body.otherUserId) return c.json({ error: 'otherUserId required' }, 400);
  const lang = parseLang(c.req.query('lang') ?? c.req.header('Accept-Language'));
  const db = getDb(c.env.horoscope_db);
  try {
    const result = await compareUsers(db, userId, body.otherUserId, lang);
    metric(c.env, 'compatibility_viewed', { mode: 'users', lang });
    if (body.persist) await persistCompatibility(db, result);
    return c.json(result);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

export default router;
