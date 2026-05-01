import { Hono } from 'hono';
import { getDb } from '../db/client';
import { parseTarotQueryParams } from '../tarot/tarotQuery';
import { getCachedTarotDaily } from '../services/tarotService';
import { parseLang } from '../utils/lang';
import type { AppBindings, AppVariables } from '../types';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.get('/', async (c) => {
  const parsed = parseTarotQueryParams(
    c.req.query('sign'),
    c.req.query('timezone'),
    c.req.query('date'),
  );
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }

  const lang = parseLang(c.req.query('lang') ?? c.req.header('Accept-Language'));
  const db = getDb(c.env.horoscope_db);
  const result = await getCachedTarotDaily(db, parsed.sign, parsed.timezone, parsed.date, lang);

  if (result.status === 404) {
    return c.json(result.body, 404);
  }
  if (result.status === 503) {
    return c.json(result.body, 503);
  }
  return c.json(result.body, 200);
});

export default router;
