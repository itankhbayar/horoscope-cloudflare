import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { dailyHoroscopes } from '../db/schema';
import { getOrCreateDailyHoroscope } from './horoscopeService';
import { ZODIAC_SIGNS, type ZodiacSign } from '../utils/zodiac';
import { SUPPORTED_LANGS, type Lang } from '../utils/lang';
import { safeDateISOForDate } from '../utils/localDate';
import { log } from '../utils/logger';

export interface PrewarmResult {
  date: string;
  timezone: string;
  generated: number;
  skipped: number;
  total: number;
  failed: number;
}

export function toDateIsoForTimezone(timestampMs: number, timezone: string): string {
  return safeDateISOForDate(new Date(timestampMs), timezone);
}

export function resolveCronDateISO(scheduledTimeMs: number, timezone = 'UTC'): string {
  return safeDateISOForDate(new Date(scheduledTimeMs), timezone);
}

export async function prewarmDailyHoroscopes(
  db: DB,
  dateISO: string,
  timezone = 'UTC',
): Promise<PrewarmResult> {
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  const signs = ZODIAC_SIGNS.map((s) => s.key as ZodiacSign);
  const langs = SUPPORTED_LANGS as readonly Lang[];

  for (const sign of signs) {
    for (const lang of langs) {
      try {
        const exists = await db
          .select({ id: dailyHoroscopes.id })
          .from(dailyHoroscopes)
          .where(
            and(
              eq(dailyHoroscopes.sign, sign),
              eq(dailyHoroscopes.date, dateISO),
              eq(dailyHoroscopes.lang, lang),
            ),
          )
          .get();

        if (exists) {
          skipped += 1;
          continue;
        }

        await getOrCreateDailyHoroscope(db, sign, lang, dateISO);
        generated += 1;
      } catch (err) {
        failed += 1;
        log({}, 'error', 'cron_horoscope_prewarm_item_failed', { sign, lang, dateISO, error: err });
      }
    }
  }

  return {
    date: dateISO,
    timezone,
    generated,
    skipped,
    total: signs.length * langs.length,
    failed,
  };
}
