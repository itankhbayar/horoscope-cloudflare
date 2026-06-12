import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { dailyHoroscopes } from '../db/schema';
import { generateDailyHoroscope, type DailyHoroscopeContent } from '../utils/horoscopeTemplates';
import { generateDailyHoroscopeWithClaude } from './claudeHoroscopeService';
import { ZODIAC_SIGNS, type ZodiacSign } from '../utils/zodiac';
import { GENERATED_LANGS, type Lang } from '../utils/lang';
import { safeDateISOForDate } from '../utils/localDate';
import { log } from '../utils/logger';

export interface PrewarmResult {
  date: string;
  timezone: string;
  generated: number;
  skipped: number;
  total: number;
  failed: number;
  /** Rows written by Claude Sonnet. */
  aiGenerated: number;
  /** Rows written by the template fallback (no API key, or Claude failed). */
  fallback: number;
}

export function toDateIsoForTimezone(timestampMs: number, timezone: string): string {
  return safeDateISOForDate(new Date(timestampMs), timezone);
}

export function resolveCronDateISO(scheduledTimeMs: number, timezone = 'UTC'): string {
  return safeDateISOForDate(new Date(scheduledTimeMs), timezone);
}

/**
 * Generates the day's horoscope rows and stores them in D1.
 *
 * When `apiKey` is provided, each sign+lang is written by Claude Sonnet; if a
 * Claude call fails, that row falls back to the static template generator so the
 * cron never leaves a gap. Without an API key, everything uses templates.
 */
export async function prewarmDailyHoroscopes(
  db: DB,
  dateISO: string,
  timezone = 'UTC',
  apiKey?: string,
  /** When true, regenerate and overwrite existing rows instead of skipping them. */
  force = false,
): Promise<PrewarmResult> {
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let aiGenerated = 0;
  let fallback = 0;

  const signs = ZODIAC_SIGNS.map((s) => s.key as ZodiacSign);
  const langs = GENERATED_LANGS as readonly Lang[];

  for (const sign of signs) {
    for (const lang of langs) {
      try {
        if (!force) {
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
        }

        let content: DailyHoroscopeContent;
        let fromAi = false;
        if (apiKey) {
          try {
            content = await generateDailyHoroscopeWithClaude(apiKey, sign, dateISO, lang);
            aiGenerated += 1;
            fromAi = true;
          } catch (err) {
            log({}, 'error', 'cron_horoscope_claude_failed', { sign, lang, dateISO, error: String(err) });
            content = generateDailyHoroscope(sign, dateISO, lang);
            fallback += 1;
          }
        } else {
          content = generateDailyHoroscope(sign, dateISO, lang);
          fallback += 1;
        }

        const insert = db
          .insert(dailyHoroscopes)
          .values({
            id: crypto.randomUUID(),
            sign,
            date: dateISO,
            lang,
            overall: content.overall,
            love: content.love,
            career: content.career,
            health: content.health,
            luckyNumber: content.luckyNumber,
            luckyColor: content.luckyColor,
          });

        // Only overwrite an existing row when we have real Claude content — never
        // clobber good data with a template fallback during a force re-run.
        if (force && fromAi) {
          await insert.onConflictDoUpdate({
            target: [dailyHoroscopes.sign, dailyHoroscopes.date, dailyHoroscopes.lang],
            set: {
              overall: content.overall,
              love: content.love,
              career: content.career,
              health: content.health,
              luckyNumber: content.luckyNumber,
              luckyColor: content.luckyColor,
            },
          });
        } else {
          await insert.onConflictDoNothing();
        }

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
    aiGenerated,
    fallback,
  };
}
