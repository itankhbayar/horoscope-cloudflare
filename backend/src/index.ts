import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import horoscopeRoutes from './routes/horoscope';
import compatibilityRoutes from './routes/compatibility';
import adminRoutes from './routes/admin';
import tarotRoutes from './routes/tarot';
import billingRoutes from './routes/billing';
import notificationsRoutes from './routes/notifications';
import { getDb } from './db/client';
import { prewarmDailyHoroscopes, resolveCronDateISO } from './services/horoscopePrewarmService';
import { prewarmTarotForTimezoneDate } from './services/tarotPrewarmService';
import type { AppBindings, AppVariables } from './types';

const DEFAULT_TIMEZONE = 'Asia/Ulaanbaatar';

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

// Stripe-Signature: allow if a proxy/browser preflights; webhook body must stay raw for verification.
app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'Stripe-Signature'],
  }),
);

app.get('/', (c) =>
  c.json({
    name: 'Horoscope API',
    status: 'ok',
    version: '1.0.0',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET  /api/auth/me',
      'GET  /api/profile',
      'PATCH /api/profile',
      'POST /api/profile/avatar',
      'POST /api/profile/recompute',
      'GET  /api/horoscope/signs',
      'GET  /api/horoscope/cities',
      'GET  /api/horoscope/daily/:sign',
      'GET  /api/horoscope/daily',
      'POST /api/compatibility/signs',
      'POST /api/compatibility/users',
      'GET  /api/tarot',
      'POST /admin/prewarm',
      'POST /admin/prewarm-tarot',
      'POST /api/billing/create-checkout-session',
      'POST /api/billing/mobile/checkout',
      'POST /api/billing/mobile/portal',
      'POST /api/billing/mobile/restore',
      'POST /api/billing/webhook',
      'GET  /api/notifications/preferences',
      'PATCH /api/notifications/preferences',
      'POST /api/notifications/push-token',
      'DELETE /api/notifications/push-token',
    ],
  }),
);

app.route('/api/auth', authRoutes);
app.route('/api/profile', profileRoutes);
app.route('/api/horoscope', horoscopeRoutes);
app.route('/api/compatibility', compatibilityRoutes);
app.route('/api/tarot', tarotRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/admin', adminRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('unhandled error', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const CRON_DAILY = '1 16 * * *';

const worker: ExportedHandler<AppBindings> = {
  fetch: app.fetch,
  scheduled(controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const db = getDb(env.horoscope_db);
        const cron = controller.cron ?? '';

        if (cron !== CRON_DAILY) return;

        const timezone = env.CRON_TIMEZONE ?? DEFAULT_TIMEZONE;
        const dateISO = resolveCronDateISO(controller.scheduledTime, timezone);

        console.log('[cron] Daily prewarm start', {
          cron,
          scheduledTime: controller.scheduledTime,
          timezone,
          dateISO,
        });

        try {
          const horoscope = await prewarmDailyHoroscopes(db, dateISO, timezone);
          console.log('[cron] Horoscope prewarm completed', horoscope);
        } catch (err) {
          console.error('[cron] Horoscope prewarm failed', {
            timezone,
            dateISO,
            error: String(err),
          });
        }

        try {
          const tarot = await prewarmTarotForTimezoneDate(db, dateISO, timezone);
          console.log('[cron] Tarot prewarm completed', tarot);
        } catch (err) {
          console.error('[cron] Tarot prewarm failed', {
            timezone,
            dateISO,
            error: String(err),
          });
        }
      })(),
    );
  },
};

export default worker;
