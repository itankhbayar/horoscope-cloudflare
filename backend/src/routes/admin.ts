import { Hono } from 'hono';
import { getDb } from '../db/client';
import {
  prewarmDailyHoroscopes,
  resolveCronDateISO,
} from '../services/horoscopePrewarmService';
import type { AppBindings, AppVariables } from '../types';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

function isAuthorized(c: { req: { header: (name: string) => string | undefined }; env: AppBindings }): boolean {
  const expected = c.env.ADMIN_SECRET;
  if (!expected) return false;
  const provided = c.req.header('x-admin-secret');
  if (!provided) return false;
  return provided === expected;
}

router.post('/prewarm', async (c) => {
  if (!isAuthorized(c)) {
    console.warn('[admin] Unauthorized prewarm attempt', {
      hasSecretConfigured: Boolean(c.env.ADMIN_SECRET),
      hasHeader: Boolean(c.req.header('x-admin-secret')),
    });
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const timezone = c.env.CRON_TIMEZONE ?? 'UTC';
  const dateISO = resolveCronDateISO(Date.now(), timezone);
  const db = getDb(c.env.horoscope_db);

  console.log('[admin] Manual horoscope prewarm started', { timezone, dateISO });

  try {
    const result = await prewarmDailyHoroscopes(db, dateISO, timezone);
    console.log('[admin] Manual horoscope prewarm completed', result);
    return c.json({
      success: true,
      date: result.date,
      timezone: result.timezone,
      generated: result.generated,
      skipped: result.skipped,
      failed: result.failed,
      total: result.total,
    });
  } catch (err) {
    console.error('[admin] Manual horoscope prewarm failed', {
      timezone,
      dateISO,
      error: String(err),
    });
    return c.json(
      {
        success: false,
        error: 'Prewarm failed',
        details: String(err),
      },
      500,
    );
  }
});

export default router;
