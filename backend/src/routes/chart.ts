import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { natalCharts } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { requirePremium } from '../middleware/premium';
import { createRateLimitMiddleware } from '../middleware/rateLimit';
import { getOrGenerateChartReading, type ChartInput } from '../services/chartReadingService';
import { parseLang } from '../utils/lang';
import { fail, ok } from '../utils/apiResponse';
import { logFromContext } from '../utils/logger';
import { captureException } from '../utils/sentry';
import type { AppBindings, AppVariables } from '../types';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

// Generating a reading is a single Claude call; the cache makes it at most one per chart+lang.
// A modest per-user limit still guards against rapid retries on a slow/failed generation.
const chartReadingRateLimit = createRateLimitMiddleware({
  keyPrefix: 'premium:chartReading',
  limit: 10,
  windowMs: 60_000,
  binding: 'PUBLIC_RATE_LIMITER',
  scope: 'user',
});

/**
 * Premium personalized natal-chart reading. Generated once per chart (cached), so repeat
 * calls return the stored reading instantly without re-calling Claude.
 */
router.post('/reading', authMiddleware, chartReadingRateLimit, requirePremium, async (c) => {
  const userId = c.get('userId');
  if (!userId) return fail(c, 401, 'UNAUTHORIZED', 'Unauthorized');

  const lang = parseLang(c.req.query('lang') ?? c.req.header('Accept-Language'));
  const db = getDb(c.env.horoscope_db);

  const chartRow = await db.select().from(natalCharts).where(eq(natalCharts.userId, userId)).get();
  if (!chartRow) {
    return fail(c, 404, 'NOT_FOUND', 'No natal chart yet — add your birth date, time, and place first.');
  }

  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Chart reading is temporarily unavailable.');
  }

  const chart: ChartInput = {
    sunSign: chartRow.sunSign,
    moonSign: chartRow.moonSign,
    risingSign: chartRow.risingSign ?? null,
    planets: chartRow.planets,
    aspects: chartRow.aspects,
  };

  try {
    const result = await getOrGenerateChartReading(db, userId, chart, lang, apiKey);
    if (result.generated) {
      logFromContext(c, 'info', 'chart_reading_generated', { userId, lang });
    }
    return ok(c, { reading: result.reading, generated: result.generated });
  } catch (err) {
    logFromContext(c, 'error', 'chart_reading_failed', { userId, lang, error: String(err) });
    captureException(err, { chartReading: { userId, lang } });
    return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Could not generate your chart reading. Please try again.');
  }
});

export default router;
