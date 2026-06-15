import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import type { DB } from '../db/client';
import { dailyHoroscopes, type DailyHoroscope } from '../db/schema';
import { enrichDailyHoroscope, generateDailyHoroscope, type PersonalizedChartContext } from '../utils/horoscopeTemplates';
import type { ZodiacSign } from '../utils/zodiac';
import type { HookTheme } from '../utils/dailyHook';
import { GENERATED_LANGS, type Lang } from '../utils/lang';
import { safeDateISO } from '../utils/localDate';
import { computeDailySkySnapshot, computeTransitToNatalAspects } from './astrologyService';

/**
 * How far back to reach for the last prewarmed Claude reading when the requested day has no row
 * yet (reader's local day is ahead of the cron prewarm). Kept small so a genuinely stalled cron
 * falls through to the template rather than serving a stale reading as if it were today's.
 */
const MAX_READING_FALLBACK_DAYS = 2;

function subtractDaysISO(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export interface HoroscopeResponse {
  sign: ZodiacSign;
  date: string;
  lang: Lang;
  overall: string;
  love: string;
  career: string;
  health: string;
  finance?: string;
  advice?: string;
  luckyNumber: number;
  luckyColor: string;
  /** Daily emotional-jolt opening line (also prepended into `overall`). */
  hook?: string;
  /** Deterministic theme behind today's hook; consumed by Premium Pattern Memory. */
  hookTheme?: HookTheme;
  blocks?: Array<{
    id: 'overall' | 'love' | 'career' | 'health' | 'finance' | 'advice' | 'lucky';
    title: string;
    paragraphs: string[];
    emphasis?: string;
  }>;
  skyContext?: {
    sunSign: ZodiacSign;
    moonSign: ZodiacSign;
    moonPhase: string;
    focusTransit?: {
      transitBody: string;
      natalBody: string;
      aspect: string;
      orb: number;
      natalHouse?: number;
      transitSign: ZodiacSign;
      natalSign: ZodiacSign;
    };
  };
}

export async function getOrCreateDailyHoroscope(
  db: DB,
  sign: ZodiacSign,
  lang: Lang,
  dateISO?: string,
  timezone?: string,
): Promise<HoroscopeResponse> {
  const date = dateISO ?? safeDateISO(timezone);
  const sky = computeDailySkySnapshot(date);
  const existing = await db
    .select()
    .from(dailyHoroscopes)
    .where(
      and(
        eq(dailyHoroscopes.sign, sign),
        eq(dailyHoroscopes.date, date),
        eq(dailyHoroscopes.lang, lang),
      ),
    )
    .get();
  if (existing) {
    // Serve the stored reading as-is. It's written by Claude (rich and unique per
    // sign+day), so we no longer regenerate from the limited templates on read.
    return mapToResponse(existing);
  }

  // No row in the requested language. Readings are only Claude-generated for GENERATED_LANGS
  // (currently Mongolian-only, to halve spend). Rather than serve a generic template to a
  // non-generated language (e.g. an English-UI user), fall back to the real stored reading in
  // a generated language so everyone sees the canonical Claude copy for the day.
  for (const genLang of GENERATED_LANGS) {
    if (genLang === lang) continue;
    const generatedRow = await db
      .select()
      .from(dailyHoroscopes)
      .where(
        and(
          eq(dailyHoroscopes.sign, sign),
          eq(dailyHoroscopes.date, date),
          eq(dailyHoroscopes.lang, genLang),
        ),
      )
      .get();
    if (generatedRow) return mapToResponse(generatedRow);
  }

  // Still nothing for *this* date. The canonical Claude reading is prewarmed once per day in
  // CRON_TIMEZONE (Asia/Ulaanbaatar). A signed-in reader whose local calendar day is already
  // ahead of that prewarm — e.g. the window after they cross midnight but before the daily cron
  // fires, most visibly for timezones east of Ulaanbaatar — would otherwise drop straight to the
  // generic template below, while the web client (which pins the UTC day via the public route)
  // still shows the rich Claude reading. That mismatch is exactly the "web fine, mobile generic"
  // bug. To keep the clients in sync, serve the most recent stored Claude reading for this sign
  // (any generated language) within a short look-back, relabeled to the requested date so the
  // client's date-keyed reveal/streak/reflection logic stays aligned with the reader's own day.
  // Bounded by MAX_READING_FALLBACK_DAYS so a stalled cron surfaces the honest (fresh-but-generic)
  // template instead of silently serving a week-old reading as today's.
  const fallbackCutoff = subtractDaysISO(date, MAX_READING_FALLBACK_DAYS);
  const recentRow = await db
    .select()
    .from(dailyHoroscopes)
    .where(
      and(
        eq(dailyHoroscopes.sign, sign),
        inArray(dailyHoroscopes.lang, [...GENERATED_LANGS]),
        lte(dailyHoroscopes.date, date),
        gte(dailyHoroscopes.date, fallbackCutoff),
      ),
    )
    .orderBy(desc(dailyHoroscopes.date))
    .get();
  if (recentRow) return { ...mapToResponse(recentRow), date };

  // Nothing stored at all yet — the daily cron prewarm writes the canonical Claude reading.
  // Generate an ephemeral, sky-aware template reading for this request WITHOUT persisting
  // it. Persisting a template here previously created a row the cron then skipped (prewarm
  // runs force=false), permanently locking the day onto repetitive template copy. Leaving
  // the table untouched lets the next prewarm write the real Claude row. The generated
  // reading is deterministic for the date, so concurrent/repeat reads stay consistent.
  const generated = generateDailyHoroscope(sign, date, lang, { sky });
  return { sign, date, lang, ...generated };
}

export function personalizeDailyHoroscope(
  horoscope: HoroscopeResponse,
  chart: PersonalizedChartContext,
  /**
   * Stable per-user token (users.id) used only to diverge template-variant selection between
   * same-sign users. Safe because this path is served `private, no-store` (never edge-cached) and
   * nothing here is persisted to the shared `dailyHoroscopes` row.
   */
  identity = '',
): HoroscopeResponse {
  const sky = computeDailySkySnapshot(horoscope.date);
  const transitAspects = computeTransitToNatalAspects(sky.planets, chart.planets);
  const personalized = {
    ...horoscope,
    ...enrichDailyHoroscope(horoscope, horoscope.sign, horoscope.date, horoscope.lang, {
      sky,
      natalChart: chart,
      transitAspects,
    }, identity),
  };
  return personalized;
}

function mapToResponse(row: DailyHoroscope): HoroscopeResponse {
  return {
    sign: row.sign as ZodiacSign,
    date: row.date,
    lang: row.lang as Lang,
    overall: row.overall,
    love: row.love,
    career: row.career,
    health: row.health,
    luckyNumber: row.luckyNumber,
    luckyColor: row.luckyColor,
  };
}

