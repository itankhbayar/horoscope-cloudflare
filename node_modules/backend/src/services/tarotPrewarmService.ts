import type { DB } from '../db/client';
import { tarotPayloadNeedsBilingualRefresh } from '../tarot/tarotPayloadQuality';
import { ZODIAC_SIGNS, type ZodiacSign } from '../utils/zodiac';
import { getTarotDailyRow, upsertTarotDaily } from './tarotService';
import { validateTarotPayload } from '../tarot/tarotValidator';

export interface TarotPrewarmResult {
  date: string;
  timezone: string;
  generated: number;
  skipped: number;
  failed: number;
  total: number;
}

/**
 * Upsert all zodiac signs for one calendar `dateISO` in a single IANA `timezone`.
 * Used by the daily 00:01 (per CRON_TIMEZONE) scheduled job and admin endpoint.
 */
export async function prewarmTarotForTimezoneDate(
  db: DB,
  dateISO: string,
  timezone: string,
): Promise<TarotPrewarmResult> {
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const signs = ZODIAC_SIGNS.map((s) => s.key as ZodiacSign);

  for (const sign of signs) {
    try {
      const existing = await getTarotDailyRow(db, sign, timezone, dateISO);
      if (existing) {
        const stillValid = validateTarotPayload(existing.payloadJson);
        if (stillValid.ok && !tarotPayloadNeedsBilingualRefresh(stillValid.value)) {
          skipped += 1;
          continue;
        }
        if (stillValid.ok && tarotPayloadNeedsBilingualRefresh(stillValid.value)) {
          console.warn('[tarot-prewarm] Stale or English-only MN cache, regenerating', { sign, dateISO, timezone });
        } else if (!stillValid.ok) {
          console.warn('[tarot-prewarm] Invalid cached payload, regenerating', { sign, dateISO, timezone });
        }
      }

      await upsertTarotDaily(db, sign, timezone, dateISO);
      generated += 1;
    } catch (err) {
      failed += 1;
      console.error('[tarot-prewarm] item failed', { sign, dateISO, timezone, error: String(err) });
    }
  }

  return {
    date: dateISO,
    timezone,
    generated,
    skipped,
    failed,
    total: signs.length,
  };
}
