import { Hono } from 'hono';
import { getDb } from '../db/client';
import {
  prewarmDailyHoroscopes,
  resolveCronDateISO,
} from '../services/horoscopePrewarmService';
import { prewarmTarotForTimezoneDate } from '../services/tarotPrewarmService';
import { isValidIanaTimeZone, isValidCalendarDate } from '../tarot/tarotQuery';
import type { AppBindings, AppVariables } from '../types';
import { secureSecretEqual } from '../utils/secureCompare';
import { captureException } from '../utils/sentry';
import { logFromContext } from '../utils/logger';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

function isAuthorized(c: { req: { header: (name: string) => string | undefined }; env: AppBindings }): boolean {
  const expected = c.env.ADMIN_SECRET;
  if (!expected) return false;
  const provided = c.req.header('x-admin-secret');
  return secureSecretEqual(provided, expected);
}

router.post('/prewarm', async (c) => {
  if (!isAuthorized(c)) {
    logFromContext(c, 'warn', 'admin_prewarm_unauthorized', {
      hasSecretConfigured: Boolean(c.env.ADMIN_SECRET),
      hasHeader: Boolean(c.req.header('x-admin-secret')),
    });
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const timezone = c.env.CRON_TIMEZONE ?? 'UTC';
  const dateISO = resolveCronDateISO(Date.now(), timezone);
  const db = getDb(c.env.horoscope_db);

  logFromContext(c, 'info', 'admin_horoscope_prewarm_started', { timezone, dateISO });

  try {
    const result = await prewarmDailyHoroscopes(db, dateISO, timezone);
    logFromContext(c, 'info', 'admin_horoscope_prewarm_completed', { ...result });
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
    logFromContext(c, 'error', 'admin_horoscope_prewarm_failed', {
      timezone,
      dateISO,
      error: err,
    });
    captureException(err, { admin: { job: 'horoscope_prewarm', dateISO, timezone } });
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

router.post('/prewarm-tarot', async (c) => {
  if (!isAuthorized(c)) {
    logFromContext(c, 'warn', 'admin_tarot_prewarm_unauthorized', {
      hasSecretConfigured: Boolean(c.env.ADMIN_SECRET),
      hasHeader: Boolean(c.req.header('x-admin-secret')),
    });
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const timezone = (c.req.query('timezone') ?? c.env.CRON_TIMEZONE ?? 'UTC').trim();
  if (!isValidIanaTimeZone(timezone)) {
    return c.json({ error: 'Invalid timezone' }, 400);
  }

  let dateISO = (c.req.query('date') ?? '').trim();
  if (!dateISO) {
    dateISO = resolveCronDateISO(Date.now(), timezone);
  } else if (!isValidCalendarDate(dateISO)) {
    return c.json({ error: 'Invalid date (YYYY-MM-DD)' }, 400);
  }

  const db = getDb(c.env.horoscope_db);
  logFromContext(c, 'info', 'admin_tarot_prewarm_started', { timezone, dateISO });

  try {
    const result = await prewarmTarotForTimezoneDate(db, dateISO, timezone);
    logFromContext(c, 'info', 'admin_tarot_prewarm_completed', { ...result });
    return c.json({ success: true, ...result });
  } catch (err) {
    logFromContext(c, 'error', 'admin_tarot_prewarm_failed', { timezone, dateISO, error: err });
    captureException(err, { admin: { job: 'tarot_prewarm', dateISO, timezone } });
    return c.json({ success: false, error: 'Tarot prewarm failed', details: String(err) }, 500);
  }
});

export default router;
