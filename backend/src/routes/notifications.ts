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
import {
  deletePushTokenSchema,
  notificationPreferencesUpdateSchema,
  pushTokenSchema,
} from '../schemas/notifications';
import { parseJsonBody, isResponse } from '../validators/request';
import { fail, ok } from '../utils/apiResponse';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.use('*', authMiddleware);

router.get('/preferences', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  const preferences = await getNotificationPreferences(db, userId);
  return ok(c, preferences);
});

router.patch('/preferences', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  const body = await parseJsonBody(c, notificationPreferencesUpdateSchema);
  if (isResponse(body)) return body;
  try {
    const updated = await updateNotificationPreferences(db, userId, body);
    return ok(c, updated);
  } catch (err) {
    return fail(c, 400, 'BAD_REQUEST', err instanceof Error ? err.message : 'Invalid payload');
  }
});

router.post('/push-token', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  const body = await parseJsonBody(c, pushTokenSchema);
  if (isResponse(body)) return body;
  try {
    await registerPushToken(db, userId, {
      expoPushToken: body.expoPushToken,
      platform: body.platform,
      deviceId: body.deviceId ?? null,
    });
    return ok(c, { ok: true });
  } catch (err) {
    return fail(c, 400, 'BAD_REQUEST', err instanceof Error ? err.message : 'Invalid payload');
  }
});

router.delete('/push-token', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  const body = await parseJsonBody(c, deletePushTokenSchema);
  if (isResponse(body)) return body;
  try {
    await disablePushToken(db, userId, body.expoPushToken);
    return ok(c, { ok: true });
  } catch (err) {
    return fail(c, 400, 'BAD_REQUEST', err instanceof Error ? err.message : 'Invalid payload');
  }
});

export default router;
