import { Hono } from 'hono';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import {
  disablePushToken,
  getNotificationPreferences,
  registerPushToken,
  updateNotificationPreferences,
} from '../services/notificationService';
import type { AppBindings, AppVariables } from '../types';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.use('*', authMiddleware);

router.get('/preferences', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  const preferences = await getNotificationPreferences(db, userId);
  return c.json(preferences);
});

router.patch('/preferences', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  try {
    const updated = await updateNotificationPreferences(db, userId, body);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Invalid payload' }, 400);
  }
});

router.post('/push-token', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  try {
    await registerPushToken(db, userId, {
      expoPushToken: typeof body.expoPushToken === 'string' ? body.expoPushToken : '',
      platform: body.platform as 'ios' | 'android' | 'web' | 'unknown',
      deviceId: typeof body.deviceId === 'string' ? body.deviceId : null,
    });
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Invalid payload' }, 400);
  }
});

router.delete('/push-token', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  try {
    const expoPushToken = typeof body.expoPushToken === 'string' ? body.expoPushToken : '';
    await disablePushToken(db, userId, expoPushToken);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Invalid payload' }, 400);
  }
});

export default router;
