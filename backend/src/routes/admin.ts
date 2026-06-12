import { Hono } from 'hono';
import { getDb } from '../db/client';
import {
  prewarmDailyHoroscopes,
  resolveCronDateISO,
} from '../services/horoscopePrewarmService';
import { prewarmPeriodHoroscopes, currentPeriodKey, PERIOD_KEY_PATTERNS } from '../services/periodHoroscopeService';
import type { PeriodType } from '../services/claudeHoroscopeService';
import { prewarmTarotForTimezoneDate } from '../services/tarotPrewarmService';
import { runRetentionPipeline } from '../services/notificationQueueService';
import { dailyHoroscopeCacheKey } from './horoscope';
import { ZODIAC_SIGNS, type ZodiacSign } from '../utils/zodiac';
import { SUPPORTED_LANGS } from '../utils/lang';
import { isValidIanaTimeZone, isValidCalendarDate } from '../tarot/tarotQuery';
import type { AppBindings, AppVariables } from '../types';
import { secureSecretEqual } from '../utils/secureCompare';
import { captureException } from '../utils/sentry';
import { logFromContext } from '../utils/logger';
import { adminPrewarmTarotQuerySchema } from '../schemas/admin';
import { parseQuery, isResponse } from '../validators/request';
import { fail } from '../utils/apiResponse';

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
    return fail(c, 401, 'UNAUTHORIZED', 'Unauthorized');
  }

  const timezone = c.env.CRON_TIMEZONE ?? 'UTC';
  const dateISO = resolveCronDateISO(Date.now(), timezone);
  const db = getDb(c.env.horoscope_db);
  const forceParam = c.req.query('force');
  const force = forceParam === '1' || forceParam === 'true';

  logFromContext(c, 'info', 'admin_horoscope_prewarm_started', { timezone, dateISO, force });

  try {
    const result = await prewarmDailyHoroscopes(db, dateISO, timezone, c.env.ANTHROPIC_API_KEY, force);
    // A force re-run replaces existing rows, so purge the edge cache too — otherwise
    // already-viewed signs keep serving the stale (pre-regeneration) reading for hours.
    if (force && typeof caches !== 'undefined') {
      const cache = caches.default;
      await Promise.all(
        ZODIAC_SIGNS.flatMap((s) =>
          SUPPORTED_LANGS.map((lang) =>
            cache.delete(dailyHoroscopeCacheKey(s.key as ZodiacSign, dateISO, lang)),
          ),
        ),
      );
    }
    logFromContext(c, 'info', 'admin_horoscope_prewarm_completed', { ...result });
    return c.json({
      success: true,
      date: result.date,
      timezone: result.timezone,
      generated: result.generated,
      skipped: result.skipped,
      failed: result.failed,
      total: result.total,
      aiGenerated: result.aiGenerated,
      fallback: result.fallback,
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
    return fail(c, 401, 'UNAUTHORIZED', 'Unauthorized');
  }

  const query = parseQuery(c, adminPrewarmTarotQuerySchema);
  if (isResponse(query)) return query;
  const timezone = query.timezone ?? c.env.CRON_TIMEZONE ?? 'UTC';
  if (!isValidIanaTimeZone(timezone)) {
    return fail(c, 400, 'BAD_REQUEST', 'Invalid timezone');
  }

  let dateISO = query.date ?? '';
  if (!dateISO) {
    dateISO = resolveCronDateISO(Date.now(), timezone);
  } else if (!isValidCalendarDate(dateISO)) {
    return fail(c, 400, 'BAD_REQUEST', 'Invalid date (YYYY-MM-DD)');
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

router.post('/run-notifications', async (c) => {
  if (!isAuthorized(c)) {
    logFromContext(c, 'warn', 'admin_run_notifications_unauthorized', {
      hasSecretConfigured: Boolean(c.env.ADMIN_SECRET),
      hasHeader: Boolean(c.req.header('x-admin-secret')),
    });
    return fail(c, 401, 'UNAUTHORIZED', 'Unauthorized');
  }

  const db = getDb(c.env.horoscope_db);
  logFromContext(c, 'info', 'admin_run_notifications_started', {});

  try {
    const result = await runRetentionPipeline(db, c.env);
    logFromContext(c, 'info', 'admin_run_notifications_completed', { ...result });
    return c.json({ success: true, ...result });
  } catch (err) {
    logFromContext(c, 'error', 'admin_run_notifications_failed', { error: err });
    captureException(err, { admin: { job: 'notification_pipeline' } });
    return c.json({ success: false, error: 'Notification pipeline failed', details: String(err) }, 500);
  }
});

router.post('/prewarm-period', async (c) => {
  if (!isAuthorized(c)) {
    logFromContext(c, 'warn', 'admin_period_prewarm_unauthorized', {
      hasSecretConfigured: Boolean(c.env.ADMIN_SECRET),
      hasHeader: Boolean(c.req.header('x-admin-secret')),
    });
    return fail(c, 401, 'UNAUTHORIZED', 'Unauthorized');
  }

  const timezone = c.env.CRON_TIMEZONE ?? 'UTC';
  const typeParam = (c.req.query('type') ?? 'both').toLowerCase();
  const forceParam = c.req.query('force');
  const force = forceParam === '1' || forceParam === 'true';
  const periodParam = c.req.query('period');
  const db = getDb(c.env.horoscope_db);

  const jobs: PeriodType[] =
    typeParam === 'weekly' ? ['weekly']
    : typeParam === 'monthly' ? ['monthly']
    : typeParam === 'yearly' ? ['yearly']
    : ['weekly', 'monthly', 'yearly'];

  logFromContext(c, 'info', 'admin_period_prewarm_started', { typeParam, force, timezone });

  try {
    const results = [];
    for (const periodType of jobs) {
      const expected = PERIOD_KEY_PATTERNS[periodType];
      const periodKey =
        periodParam && expected.test(periodParam) ? periodParam : currentPeriodKey(periodType, timezone);
      results.push(await prewarmPeriodHoroscopes(db, periodType, periodKey, c.env.ANTHROPIC_API_KEY, force));
    }
    logFromContext(c, 'info', 'admin_period_prewarm_completed', { results });
    return c.json({ success: true, results });
  } catch (err) {
    logFromContext(c, 'error', 'admin_period_prewarm_failed', { error: err });
    captureException(err, { admin: { job: 'period_horoscope_prewarm' } });
    return c.json({ success: false, error: 'Period prewarm failed', details: String(err) }, 500);
  }
});

export default router;
