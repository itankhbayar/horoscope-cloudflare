import { Hono } from 'hono';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { getFullProfile, recomputeNatalChart } from '../services/profileService';
import type { AppBindings, AppVariables } from '../types';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.use('*', authMiddleware);

router.get('/', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  try {
    const profile = await getFullProfile(db, userId);
    return c.json(profile);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 404);
  }
});

router.post('/recompute', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  try {
    await recomputeNatalChart(db, userId);
    const profile = await getFullProfile(db, userId);
    return c.json(profile);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

export default router;
