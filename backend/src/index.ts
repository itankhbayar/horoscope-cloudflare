import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import horoscopeRoutes from './routes/horoscope';
import compatibilityRoutes from './routes/compatibility';
import adminRoutes from './routes/admin';
import tarotRoutes from './routes/tarot';
import { getDb } from './db/client';
import { prewarmDailyHoroscopes, resolveCronDateISO } from './services/horoscopePrewarmService';
import { prewarmTarotForTimezoneDate } from './services/tarotPrewarmService';
import type { AppBindings, AppVariables } from './types';

const DEFAULT_TIMEZONE = 'Asia/Ulaanbaatar';

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use('/*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'] }));

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
    ],
  }),
);

app.route('/api/auth', authRoutes);
app.route('/api/profile', profileRoutes);
app.route('/api/horoscope', horoscopeRoutes);
app.route('/api/compatibility', compatibilityRoutes);
app.route('/api/tarot', tarotRoutes);
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
