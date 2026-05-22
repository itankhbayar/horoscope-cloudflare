import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as Sentry from '@sentry/cloudflare';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import horoscopeRoutes from './routes/horoscope';
import compatibilityRoutes from './routes/compatibility';
import adminRoutes from './routes/admin';
import tarotRoutes from './routes/tarot';
import billingRoutes from './routes/billing';
import notificationsRoutes from './routes/notifications';
import accountRoutes from './routes/account';
import { getDb } from './db/client';
import { isAllowedCorsOrigin } from './env';
import { prewarmDailyHoroscopes, resolveCronDateISO } from './services/horoscopePrewarmService';
import { prewarmTarotForTimezoneDate } from './services/tarotPrewarmService';
import { CRON_DAILY } from './cron';
import type { AppBindings, AppVariables } from './types';
import { requestContextMiddleware } from './utils/requestContext';
import { captureException, sentryOptions } from './utils/sentry';
import { log, logFromContext, metric } from './utils/logger';

const DEFAULT_TIMEZONE = 'Asia/Ulaanbaatar';

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

// Stripe-Signature: allow if a proxy/browser preflights; webhook body must stay raw for verification.
app.use(
  '/*',
  requestContextMiddleware,
);

app.use(
  '/*',
  cors({
    origin: (origin) => {
      if (!origin) return null;
      return isAllowedCorsOrigin(origin) ? origin : null;
    },
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'Stripe-Signature'],
  }),
);

app.get('/', (c) => c.text('Backend working'));

app.get('/health', async (c) => {
  const started = Date.now();
  try {
    await c.env.horoscope_db.prepare('SELECT 1 AS ok').first?.();
    return c.json({
      ok: true,
      dependencies: { d1: 'ok' },
      environment: c.env.APP_ENV ?? c.env.ENVIRONMENT ?? 'development',
      durationMs: Date.now() - started,
    });
  } catch (err) {
    logFromContext(c, 'error', 'health_check_failed', { error: err });
    captureException(err, { route: { path: '/health' } });
    return c.json(
      {
        ok: false,
        dependencies: { d1: 'error' },
        durationMs: Date.now() - started,
      },
      503,
    );
  }
});

app.route('/api/auth', authRoutes);
app.route('/api/profile', profileRoutes);
app.route('/api/horoscope', horoscopeRoutes);
app.route('/api/compatibility', compatibilityRoutes);
app.route('/api/tarot', tarotRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/account', accountRoutes);
app.route('/admin', adminRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  logFromContext(c, 'error', 'route_unhandled_exception', { error: err });
  captureException(err, { route: { path: c.req.path, method: c.req.method } });
  return c.json({ error: 'Internal server error' }, 500);
});

const worker: ExportedHandler<AppBindings> = {
  fetch: app.fetch,
  scheduled(controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const started = Date.now();
        const cron = controller.cron ?? '';

        if (cron !== CRON_DAILY) {
          log(env, 'warn', 'cron_skipped_unmatched_trigger', {
            receivedCron: cron,
            expectedCron: CRON_DAILY,
          });
          return;
        }

        const db = getDb(env.horoscope_db);
        const timezone = env.CRON_TIMEZONE ?? DEFAULT_TIMEZONE;
        const dateISO = resolveCronDateISO(controller.scheduledTime, timezone);

        log(env, 'info', 'cron_started', {
          cron,
          scheduledTime: controller.scheduledTime,
          timezone,
          dateISO,
        });

        try {
          const jobStarted = Date.now();
          const horoscope = await prewarmDailyHoroscopes(db, dateISO, timezone);
          log(env, 'info', 'cron_horoscope_prewarm_completed', {
            ...horoscope,
            durationMs: Date.now() - jobStarted,
          });
          metric(env, 'cron_horoscope_prewarm_success', { generated: horoscope.generated, failed: horoscope.failed });
        } catch (err) {
          log(env, 'error', 'cron_horoscope_prewarm_failed', {
            timezone,
            dateISO,
            error: String(err),
          });
          metric(env, 'cron_horoscope_prewarm_failure', { dateISO });
          captureException(err, { cron: { job: 'horoscope_prewarm', dateISO, timezone } });
        }

        try {
          const jobStarted = Date.now();
          const tarot = await prewarmTarotForTimezoneDate(db, dateISO, timezone);
          log(env, 'info', 'cron_tarot_prewarm_completed', {
            ...tarot,
            durationMs: Date.now() - jobStarted,
          });
          metric(env, 'cron_tarot_prewarm_success', { generated: tarot.generated, failed: tarot.failed });
        } catch (err) {
          log(env, 'error', 'cron_tarot_prewarm_failed', {
            timezone,
            dateISO,
            error: String(err),
          });
          metric(env, 'cron_tarot_prewarm_failure', { dateISO });
          captureException(err, { cron: { job: 'tarot_prewarm', dateISO, timezone } });
        }

        log(env, 'info', 'cron_completed', {
          cron,
          dateISO,
          timezone,
          durationMs: Date.now() - started,
        });
      })(),
    );
  },
};

export default Sentry.withSentry(sentryOptions, worker);
