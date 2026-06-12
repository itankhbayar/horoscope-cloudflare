import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { dailyHoroscopes, type DailyHoroscope } from '../db/schema';
import { enrichDailyHoroscope, generateDailyHoroscope, type PersonalizedChartContext } from '../utils/horoscopeTemplates';
import type { ZodiacSign } from '../utils/zodiac';
import type { HookTheme } from '../utils/dailyHook';
import { GENERATED_LANGS, type Lang } from '../utils/lang';
import { safeDateISO } from '../utils/localDate';
import { computeDailySkySnapshot, computeTransitToNatalAspects } from './astrologyService';

const legacyUpgradeRunState = new Map<string, boolean>();

function summarizeExtendedFields(payload: {
  blocks?: unknown;
  finance?: unknown;
  advice?: unknown;
}): {
  hasBlocks: boolean;
  blockCount: number;
  blockParagraphCounts: number[];
  financeLength: number;
  adviceLength: number;
} {
  const blocks = Array.isArray(payload.blocks) ? payload.blocks : [];
  return {
    hasBlocks: Array.isArray(payload.blocks),
    blockCount: blocks.length,
    blockParagraphCounts: blocks.map((b: any) => (Array.isArray(b?.paragraphs) ? b.paragraphs.length : 0)),
    financeLength: typeof payload.finance === 'string' ? payload.finance.length : 0,
    adviceLength: typeof payload.advice === 'string' ? payload.advice.length : 0,
  };
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
  const debugKey = `${lang}:${sign}:${date}`;
  legacyUpgradeRunState.set(debugKey, false);
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
  // Temporary diagnostics: shape entering personalize.
  // eslint-disable-next-line no-console
  console.log('[horoscope-service-personalize-input]', {
    date: horoscope.date,
    lang: horoscope.lang,
    sign: horoscope.sign,
    inputKeys: Object.keys(horoscope),
    inputSummary: summarizeExtendedFields(horoscope as any),
  });
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
  // Temporary diagnostics: shape exiting personalize.
  // eslint-disable-next-line no-console
  console.log('[horoscope-service-personalize-output]', {
    date: personalized.date,
    lang: personalized.lang,
    sign: personalized.sign,
    outputKeys: Object.keys(personalized),
    outputSummary: summarizeExtendedFields(personalized as any),
  });
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

export function consumeLegacyUpgradeRunState(sign: ZodiacSign, lang: Lang, date: string): boolean {
  const key = `${lang}:${sign}:${date}`;
  const value = legacyUpgradeRunState.get(key) ?? false;
  legacyUpgradeRunState.delete(key);
  return value;
}
