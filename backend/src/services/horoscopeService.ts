import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { dailyHoroscopes, type DailyHoroscope } from '../db/schema';
import { enrichDailyHoroscope, generateDailyHoroscope, type PersonalizedChartContext } from '../utils/horoscopeTemplates';
import type { ZodiacSign } from '../utils/zodiac';
import type { HookTheme } from '../utils/dailyHook';
import type { Lang } from '../utils/lang';
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
    // Temporary diagnostics: fields as loaded from DB row.
    // eslint-disable-next-line no-console
    console.log('[horoscope-service-db-read-existing-row]', {
      sign,
      lang,
      date,
      rowKeys: Object.keys(existing),
      rowSummary: summarizeExtendedFields(existing as any),
    });
    let response = mapToResponse(existing);
    const hadBlocksBefore = Array.isArray(response.blocks) && response.blocks.length > 0;
    if (lang === 'mn' && !hadBlocksBefore) {
      const regenerated = generateDailyHoroscope(sign, date, lang, { sky });
      response = { ...response, ...regenerated };
    }
    // Temporary diagnostics: shape after DB row mapping.
    // eslint-disable-next-line no-console
    console.log('[horoscope-service-map-to-response-existing]', {
      sign,
      lang,
      date,
      responseKeys: Object.keys(response),
      responseSummary: summarizeExtendedFields(response as any),
    });
    const enriched = { ...response, ...enrichDailyHoroscope(response, sign, date, lang, { sky }) };
    // Temporary diagnostics: shape after enrich.
    // eslint-disable-next-line no-console
    console.log('[horoscope-service-after-enrich-existing]', {
      sign,
      lang,
      date,
      enrichedKeys: Object.keys(enriched),
      enrichedSummary: summarizeExtendedFields(enriched as any),
    });
    if (shouldUpgradeLegacyMnContent(lang, existing)) {
      legacyUpgradeRunState.set(debugKey, true);
      const upgraded = generateDailyHoroscope(sign, date, lang, { sky });
      // Temporary diagnostics: generated upgrade payload before DB update.
      // eslint-disable-next-line no-console
      console.log('[horoscope-service-before-db-update-upgrade]', {
        sign,
        lang,
        date,
        generatedKeys: Object.keys(upgraded),
        generatedSummary: summarizeExtendedFields(upgraded as any),
      });
      await db
        .update(dailyHoroscopes)
        .set({
          overall: upgraded.overall,
          love: upgraded.love,
          career: upgraded.career,
          health: upgraded.health,
          luckyNumber: upgraded.luckyNumber,
          luckyColor: upgraded.luckyColor,
        })
        .where(
          and(
            eq(dailyHoroscopes.sign, sign),
            eq(dailyHoroscopes.date, date),
            eq(dailyHoroscopes.lang, lang),
          ),
        )
        .run();
      // Temporary diagnostics: returned object shape after upgrade path.
      // eslint-disable-next-line no-console
      console.log('[horoscope-service-return-upgrade]', {
        sign,
        lang,
        date,
        returnKeys: Object.keys({ ...response, ...upgraded }),
        returnSummary: summarizeExtendedFields({ ...response, ...upgraded } as any),
      });
      return { ...response, ...upgraded };
    }
    // Temporary diagnostics: returned object shape for existing-row path.
    // eslint-disable-next-line no-console
    console.log('[horoscope-service-return-existing]', {
      sign,
      lang,
      date,
      returnKeys: Object.keys(enriched),
      returnSummary: summarizeExtendedFields(enriched as any),
    });
    return enriched;
  }

  const generated = generateDailyHoroscope(sign, date, lang, { sky });
  // Temporary diagnostics: generated payload before DB insert.
  // eslint-disable-next-line no-console
  console.log('[horoscope-service-before-db-insert-generated]', {
    sign,
    lang,
    date,
    generatedKeys: Object.keys(generated),
    generatedSummary: summarizeExtendedFields(generated as any),
  });
  const id = crypto.randomUUID();
  await db
    .insert(dailyHoroscopes)
    .values({
      id,
      sign,
      date,
      lang,
      overall: generated.overall,
      love: generated.love,
      career: generated.career,
      health: generated.health,
      luckyNumber: generated.luckyNumber,
      luckyColor: generated.luckyColor,
    })
    .onConflictDoNothing();

  const persisted = await db
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

  if (persisted) {
    // Temporary diagnostics: fields as loaded from persisted DB row.
    // eslint-disable-next-line no-console
    console.log('[horoscope-service-db-read-persisted-row]', {
      sign,
      lang,
      date,
      rowKeys: Object.keys(persisted),
      rowSummary: summarizeExtendedFields(persisted as any),
    });
    const response = mapToResponse(persisted);
    const enriched = { ...response, ...enrichDailyHoroscope(response, sign, date, lang, { sky }) };
    // Temporary diagnostics: returned object shape after persisted-row enrich.
    // eslint-disable-next-line no-console
    console.log('[horoscope-service-return-persisted]', {
      sign,
      lang,
      date,
      returnKeys: Object.keys(enriched),
      returnSummary: summarizeExtendedFields(enriched as any),
    });
    return enriched;
  }
  // Temporary diagnostics: fallback return shape if row isn't persisted.
  // eslint-disable-next-line no-console
  console.log('[horoscope-service-return-in-memory-generated]', {
    sign,
    lang,
    date,
    returnKeys: Object.keys({ sign, date, lang, ...generated }),
    returnSummary: summarizeExtendedFields({ sign, date, lang, ...generated } as any),
  });
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

function shouldUpgradeLegacyMnContent(lang: Lang, row: DailyHoroscope): boolean {
  if (lang !== 'mn') return false;
  return (
    wordCount(row.overall) < 90
    || wordCount(row.love) < 55
    || wordCount(row.career) < 55
    || wordCount(row.health) < 35
  );
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function consumeLegacyUpgradeRunState(sign: ZodiacSign, lang: Lang, date: string): boolean {
  const key = `${lang}:${sign}:${date}`;
  const value = legacyUpgradeRunState.get(key) ?? false;
  legacyUpgradeRunState.delete(key);
  return value;
}
