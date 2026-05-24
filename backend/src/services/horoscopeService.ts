import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { dailyHoroscopes, type DailyHoroscope } from '../db/schema';
import { enrichDailyHoroscope, generateDailyHoroscope, type PersonalizedChartContext } from '../utils/horoscopeTemplates';
import type { ZodiacSign } from '../utils/zodiac';
import type { Lang } from '../utils/lang';
import { safeDateISO } from '../utils/localDate';
import { computeDailySkySnapshot, computeTransitToNatalAspects } from './astrologyService';

export interface HoroscopeResponse {
  sign: ZodiacSign;
  date: string;
  lang: Lang;
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
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
    const response = mapToResponse(existing);
    return { ...response, ...enrichDailyHoroscope(response, sign, date, lang, { sky }) };
  }

  const generated = generateDailyHoroscope(sign, date, lang, { sky });
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
    const response = mapToResponse(persisted);
    return { ...response, ...enrichDailyHoroscope(response, sign, date, lang, { sky }) };
  }
  return { sign, date, lang, ...generated };
}

export function personalizeDailyHoroscope(
  horoscope: HoroscopeResponse,
  chart: PersonalizedChartContext,
): HoroscopeResponse {
  const sky = computeDailySkySnapshot(horoscope.date);
  const transitAspects = computeTransitToNatalAspects(sky.planets, chart.planets);
  return {
    ...horoscope,
    ...enrichDailyHoroscope(horoscope, horoscope.sign, horoscope.date, horoscope.lang, {
      sky,
      natalChart: chart,
      transitAspects,
    }),
  };
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
