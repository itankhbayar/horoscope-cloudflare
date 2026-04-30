import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { dailyHoroscopes, type DailyHoroscope } from '../db/schema';
import { generateDailyHoroscope } from '../utils/horoscopeTemplates';
import type { ZodiacSign } from '../utils/zodiac';
import type { Lang } from '../utils/lang';

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
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getOrCreateDailyHoroscope(
  db: DB,
  sign: ZodiacSign,
  lang: Lang,
  dateISO?: string,
): Promise<HoroscopeResponse> {
  const date = dateISO ?? todayISO();
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
  if (existing) return mapToResponse(existing);

  const generated = generateDailyHoroscope(sign, date, lang);
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

  return persisted ? mapToResponse(persisted) : { sign, date, lang, ...generated };
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
