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

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.get('/signs', (c) => c.json(ZODIAC_SIGNS));

router.get('/cities', (c) => {
  const q = c.req.query('q') ?? '';
  const limit = Math.min(parseInt(c.req.query('limit') ?? '10', 10) || 10, 25);
  return c.json(searchCities(q, limit));
});

router.get('/daily/:sign', async (c) => {
  const sign = c.req.param('sign').toLowerCase();
  if (!isZodiacSign(sign)) return c.json({ error: 'Unknown sign' }, 400);
  const date = c.req.query('date') ?? undefined;
  const lang = parseLang(c.req.query('lang') ?? c.req.header('Accept-Language'));
  const db = getDb(c.env.horoscope_db);
  const horoscope = await getOrCreateDailyHoroscope(db, sign, lang, date);
  return c.json(horoscope);
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
  return c.json({
    ...horoscope,
    sunSign: chart.sunSign,
    moonSign: chart.moonSign,
    risingSign: chart.risingSign,
  });
});

export default router;
