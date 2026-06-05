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
import ritualsRoutes from './routes/rituals';
import reflectionsRoutes from './routes/reflections';
import openApiRoutes from './routes/openapi';
import { getDb } from './db/client';
import { isAllowedCorsOrigin } from './env';
import { prewarmDailyHoroscopes, resolveCronDateISO } from './services/horoscopePrewarmService';
import { prewarmTarotForTimezoneDate } from './services/tarotPrewarmService';
import { cleanupOperationalData } from './services/cleanupService';
import { runRetentionPipeline } from './services/notificationQueueService';
import { CRON_DAILY, CRON_HOURLY } from './cron';
import type { AppBindings, AppVariables } from './types';
import { requestContextMiddleware } from './utils/requestContext';
import { captureException, sentryOptions } from './utils/sentry';
import { log, logFromContext, metric } from './utils/logger';
import { requestHardeningMiddleware } from './middleware/requestHardening';
import { fail, ok } from './utils/apiResponse';
export { RateLimitBucket } from './rateLimitBucket';

const DEFAULT_TIMEZONE = 'Asia/Ulaanbaatar';
const HOROSCOPE_SERVICE_BUILD_VERSION = 'v3-hydration';
const isDevDiagnostics = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

if (isDevDiagnostics) {
  // Temporary runtime diagnostics for deployment mismatch.
  // eslint-disable-next-line no-console
  console.log('[horoscope-service-startup]', {
    HOROSCOPE_SERVICE_BUILD_VERSION,
    nodeEnv: process.env.NODE_ENV,
    processEnv: process.env,
  });
}

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
    return ok(c, {
      ok: true,
      dependencies: { d1: 'ok' },
      environment: c.env.APP_ENV ?? c.env.ENVIRONMENT ?? 'development',
      durationMs: Date.now() - started,
    });
  } catch (err) {
    logFromContext(c, 'error', 'health_check_failed', { error: err });
    captureException(err, { route: { path: '/health' } });
    return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Health check failed', {
      dependencies: { d1: 'error' },
      durationMs: Date.now() - started,
    });
  }
});

app.use('/api/*', requestHardeningMiddleware);

const v1 = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
v1.route('/auth', authRoutes);
v1.route('/profile', profileRoutes);
v1.route('/horoscope', horoscopeRoutes);
v1.route('/compatibility', compatibilityRoutes);
v1.route('/tarot', tarotRoutes);
v1.route('/billing', billingRoutes);
v1.route('/notifications', notificationsRoutes);
v1.route('/account', accountRoutes);
v1.route('/rituals', ritualsRoutes);
v1.route('/reflections', reflectionsRoutes);
v1.route('/', openApiRoutes);

app.route('/api/v1', v1);

app.route('/api/auth', authRoutes);
app.route('/api/profile', profileRoutes);
app.route('/api/horoscope', horoscopeRoutes);
app.route('/api/compatibility', compatibilityRoutes);
app.route('/api/tarot', tarotRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/account', accountRoutes);
app.route('/api/rituals', ritualsRoutes);
app.route('/api/reflections', reflectionsRoutes);
app.route('/api', openApiRoutes);
app.route('/admin', adminRoutes);

app.notFound((c) => fail(c, 404, 'NOT_FOUND', 'Not found'));

app.onError((err, c) => {
  logFromContext(c, 'error', 'route_unhandled_exception', { error: err });
  captureException(err, { route: { path: c.req.path, method: c.req.method } });
  return fail(c, 500, 'INTERNAL_ERROR', 'Internal server error');
});

const worker: ExportedHandler<AppBindings> = {
  fetch: app.fetch,
  scheduled(controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const started = Date.now();
        const cron = controller.cron ?? '';

        if (cron !== CRON_DAILY && cron !== CRON_HOURLY) {
          log(env, 'warn', 'cron_skipped_unmatched_trigger', {
            receivedCron: cron,
            expectedCrons: [CRON_DAILY, CRON_HOURLY],
          });
          return;
        }

        const db = getDb(env.horoscope_db);
        const timezone = env.CRON_TIMEZONE ?? DEFAULT_TIMEZONE;

        if (cron === CRON_HOURLY) {
          try {
            const jobStarted = Date.now();
            const pipeline = await runRetentionPipeline(db, env, { nowMs: controller.scheduledTime });
            log(env, 'info', 'cron_notification_pipeline_completed', {
              ...pipeline,
              durationMs: Date.now() - jobStarted,
            });
            metric(env, 'cron_notification_pipeline_success', {
              enqueued: pipeline.enqueue.enqueued,
              sent: pipeline.deliver.sent,
              failed: pipeline.deliver.failed,
              tokensDisabled: pipeline.deliver.tokensDisabled + pipeline.receipts.tokensDisabled,
            });
          } catch (err) {
            log(env, 'error', 'cron_notification_pipeline_failed', { error: String(err) });
            metric(env, 'cron_notification_pipeline_failure', {});
            captureException(err, { cron: { job: 'notification_pipeline' } });
          }
          log(env, 'info', 'cron_completed', { cron, timezone, durationMs: Date.now() - started });
          return;
        }

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

        try {
          const jobStarted = Date.now();
          const cleanup = await cleanupOperationalData(db, env);
          log(env, 'info', 'cron_operational_cleanup_completed', {
            deleted: cleanup.deleted,
            jobs: cleanup.jobs,
            durationMs: Date.now() - jobStarted,
          });
        } catch (err) {
          log(env, 'error', 'cron_operational_cleanup_failed', {
            timezone,
            dateISO,
            error: String(err),
          });
          metric(env, 'cron_operational_cleanup_failure', { dateISO });
          captureException(err, { cron: { job: 'operational_cleanup', dateISO, timezone } });
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
