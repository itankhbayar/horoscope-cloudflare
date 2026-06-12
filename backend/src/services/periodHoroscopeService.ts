import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { periodHoroscopes } from '../db/schema';
import { generateDailyHoroscope, type DailyHoroscopeContent } from '../utils/horoscopeTemplates';
import { generatePeriodHoroscopeWithClaude, type PeriodType } from './claudeHoroscopeService';
import { ZODIAC_SIGNS, type ZodiacSign } from '../utils/zodiac';
import { GENERATED_LANGS, type Lang } from '../utils/lang';
import { safeDateISO } from '../utils/localDate';
import { log } from '../utils/logger';

export interface PeriodHoroscopeResponse {
  sign: ZodiacSign;
  periodType: PeriodType;
  periodKey: string;
  lang: Lang;
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
}

export interface PeriodPrewarmResult {
  periodType: PeriodType;
  periodKey: string;
  generated: number;
  skipped: number;
  total: number;
  failed: number;
  aiGenerated: number;
  fallback: number;
}

/** Valid period-key shape per type, shared by routes/admin so a key never lands under the wrong type. */
export const PERIOD_KEY_PATTERNS: Record<PeriodType, RegExp> = {
  weekly: /^\d{4}-W\d{2}$/,
  monthly: /^\d{4}-\d{2}$/,
  yearly: /^\d{4}$/,
};

/** ISO-8601 week key for a calendar date, e.g. '2026-06-11' -> '2026-W24'. */
export function isoWeekKey(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Shift to the Thursday of this ISO week — it determines the week-numbering year.
  const dow = date.getUTCDay() || 7; // 1 = Monday … 7 = Sunday
  date.setUTCDate(date.getUTCDate() + 4 - dow);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Current period key for the given type in a timezone: 'YYYY-Www' (weekly), 'YYYY-MM' (monthly) or 'YYYY' (yearly). */
export function currentPeriodKey(periodType: PeriodType, timezone?: string): string {
  const dateISO = safeDateISO(timezone);
  if (periodType === 'yearly') return dateISO.slice(0, 4);
  if (periodType === 'monthly') return dateISO.slice(0, 7);
  return isoWeekKey(dateISO);
}

function mapRow(row: typeof periodHoroscopes.$inferSelect): PeriodHoroscopeResponse {
  return {
    sign: row.sign as ZodiacSign,
    periodType: row.periodType as PeriodType,
    periodKey: row.periodKey,
    lang: row.lang as Lang,
    overall: row.overall,
    love: row.love,
    career: row.career,
    health: row.health,
    luckyNumber: row.luckyNumber,
    luckyColor: row.luckyColor,
  };
}

/**
 * Read path: returns the stored period reading, or (on a miss) generates a fast
 * template fallback, stores it, and returns it. Claude generation happens in the
 * cron/admin prewarm path — never on a user request — so reads stay fast.
 */
export async function getOrCreatePeriodHoroscope(
  db: DB,
  sign: ZodiacSign,
  periodType: PeriodType,
  periodKey: string,
  lang: Lang,
): Promise<PeriodHoroscopeResponse> {
  const existing = await db
    .select()
    .from(periodHoroscopes)
    .where(
      and(
        eq(periodHoroscopes.sign, sign),
        eq(periodHoroscopes.periodType, periodType),
        eq(periodHoroscopes.periodKey, periodKey),
        eq(periodHoroscopes.lang, lang),
      ),
    )
    .get();

  if (existing) return mapRow(existing);

  // No row in the requested language. Readings are only Claude-generated for GENERATED_LANGS
  // (currently Mongolian-only). Serve the real stored reading in a generated language before
  // dropping to a template, so a non-generated language (e.g. English UI) still gets the
  // canonical Claude copy for the period.
  for (const genLang of GENERATED_LANGS) {
    if (genLang === lang) continue;
    const generatedRow = await db
      .select()
      .from(periodHoroscopes)
      .where(
        and(
          eq(periodHoroscopes.sign, sign),
          eq(periodHoroscopes.periodType, periodType),
          eq(periodHoroscopes.periodKey, periodKey),
          eq(periodHoroscopes.lang, genLang),
        ),
      )
      .get();
    if (generatedRow) return mapRow(generatedRow);
  }

  // Fallback: reuse the daily template generator (seeded by the period key) so users never
  // hit an error before the cron has filled in the Claude reading. Returned in-memory and
  // deliberately NOT persisted — persisting a template row here used to lock the entire
  // period onto template copy, because the period prewarm (force=false) then skipped the
  // already-present row. Leaving the table empty lets the next prewarm write real Claude.
  const content = generateDailyHoroscope(sign, periodKey, lang);
  return {
    sign,
    periodType,
    periodKey,
    lang,
    overall: content.overall,
    love: content.love,
    career: content.career,
    health: content.health,
    luckyNumber: content.luckyNumber,
    luckyColor: content.luckyColor,
  };
}

/**
 * Generates the period's horoscope rows (12 signs x langs) and stores them in D1.
 * With an `apiKey`, each row is written by Claude Sonnet (falling back to templates
 * on any failure). `force` overwrites existing rows instead of skipping them.
 */
export async function prewarmPeriodHoroscopes(
  db: DB,
  periodType: PeriodType,
  periodKey: string,
  apiKey?: string,
  force = false,
): Promise<PeriodPrewarmResult> {
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
            .select({ id: periodHoroscopes.id })
            .from(periodHoroscopes)
            .where(
              and(
                eq(periodHoroscopes.sign, sign),
                eq(periodHoroscopes.periodType, periodType),
                eq(periodHoroscopes.periodKey, periodKey),
                eq(periodHoroscopes.lang, lang),
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
            content = await generatePeriodHoroscopeWithClaude(apiKey, sign, periodType, periodKey, lang);
            aiGenerated += 1;
            fromAi = true;
          } catch (err) {
            log({}, 'error', 'cron_period_horoscope_claude_failed', {
              sign,
              lang,
              periodType,
              periodKey,
              error: String(err),
            });
            content = generateDailyHoroscope(sign, periodKey, lang);
            fallback += 1;
          }
        } else {
          content = generateDailyHoroscope(sign, periodKey, lang);
          fallback += 1;
        }

        const insert = db
          .insert(periodHoroscopes)
          .values({
            id: crypto.randomUUID(),
            sign,
            periodType,
            periodKey,
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
            target: [
              periodHoroscopes.sign,
              periodHoroscopes.periodType,
              periodHoroscopes.periodKey,
              periodHoroscopes.lang,
            ],
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
        log({}, 'error', 'cron_period_horoscope_prewarm_item_failed', {
          sign,
          lang,
          periodType,
          periodKey,
          error: err,
        });
      }
    }
  }

  return {
    periodType,
    periodKey,
    generated,
    skipped,
    total: signs.length * langs.length,
    failed,
    aiGenerated,
    fallback,
  };
}
