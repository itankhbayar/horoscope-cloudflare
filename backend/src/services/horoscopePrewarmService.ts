import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { dailyHoroscopes } from '../db/schema';
import { getOrCreateDailyHoroscope } from './horoscopeService';
import { ZODIAC_SIGNS, type ZodiacSign } from '../utils/zodiac';
import { SUPPORTED_LANGS, type Lang } from '../utils/lang';

export interface PrewarmResult {
  date: string;
  timezone: string;
  generated: number;
  skipped: number;
  total: number;
  failed: number;
}

function toDateIsoForTimezone(timestampMs: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestampMs));

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function resolveCronDateISO(scheduledTimeMs: number, timezone = 'UTC'): string {
  try {
    return toDateIsoForTimezone(scheduledTimeMs, timezone);
  } catch {
    return toDateIsoForTimezone(scheduledTimeMs, 'UTC');
  }
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
        console.error('[cron] Failed prewarm item', { sign, lang, dateISO, error: String(err) });
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
