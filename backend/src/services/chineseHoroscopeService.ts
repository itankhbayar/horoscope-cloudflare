/**
 * Chinese (lunar) zodiac readings — the Chinese counterpart of the Western
 * claudeHoroscopeService + horoscopeService + period/prewarm services, consolidated
 * into one file (the feature is a clean mirror with no astronomy layer).
 *
 * - Claude generation (daily + period) with the same direct-`fetch`, retry/backoff,
 *   and strict-JSON contract as the Western generator.
 * - Read path (`getOrCreateChinese*`) serves straight from D1 and falls back to
 *   templates so a Claude outage never reaches the user.
 * - Prewarm (`prewarmChinese*`) is driven by the daily cron / admin endpoint.
 */

import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import type { DB } from '../db/client';
import { chineseDailyHoroscopes, chinesePeriodHoroscopes } from '../db/schema';
import {
  generateChineseReading,
  type ChineseReadingContent,
} from '../utils/chineseHoroscopeTemplates';
import {
  ANIMAL_ORDER,
  getChineseAnimalInfo,
  type ChineseAnimal,
} from '../utils/chineseZodiac';
import { GENERATED_LANGS, type Lang } from '../utils/lang';
import { safeDateISO } from '../utils/localDate';
import { log } from '../utils/logger';
import type { PeriodType } from './claudeHoroscopeService';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
// Mirrors the Western generator: readings are prewarmed once per period and served from
// D1, so model choice is purely a text-quality decision. Mongolian needs Sonnet fluency.
const DAILY_MODEL = 'claude-sonnet-4-6';
const PERIOD_MODEL = 'claude-sonnet-4-6';

/** See horoscopeService.ts — small look-back so a reader ahead of the cron still gets Claude copy. */
const MAX_READING_FALLBACK_DAYS = 2;

function subtractDaysISO(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** Mongolian animal names — Mongolian is the primary language for this app. */
const MN_ANIMAL_NAMES: Record<ChineseAnimal, string> = {
  rat: 'Хулгана', ox: 'Үхэр', tiger: 'Бар', rabbit: 'Туулай', dragon: 'Луу', snake: 'Могой',
  horse: 'Морь', goat: 'Хонь', monkey: 'Мич', rooster: 'Тахиа', dog: 'Нохой', pig: 'Гахай',
};
const EN_ANIMAL_NAMES: Record<ChineseAnimal, string> = {
  rat: 'Rat', ox: 'Ox', tiger: 'Tiger', rabbit: 'Rabbit', dragon: 'Dragon', snake: 'Snake',
  horse: 'Horse', goat: 'Goat', monkey: 'Monkey', rooster: 'Rooster', dog: 'Dog', pig: 'Pig',
};

const MN_ELEMENT: Record<string, string> = { wood: 'модон', fire: 'галт', earth: 'шороон', metal: 'төмөр', water: 'усан' };
const EN_ELEMENT: Record<string, string> = { wood: 'wood', fire: 'fire', earth: 'earth', metal: 'metal', water: 'water' };

const ESSENCE_MN: Record<ChineseAnimal, string> = {
  rat: 'авхаалж самбаа, хурдан ухаан, дасан зохицох чадвар, дур булаам байдал',
  ox: 'хичээл зүтгэл, найдвартай байдал, тэвчээр, дотоод хүч',
  tiger: 'эр зориг, өөртөө итгэх итгэл, манлайлал, тэмүүлэл',
  rabbit: 'зөөлөн зан, эв зүй, мэдрэмж, дэгжин байдал',
  dragon: 'эрмэлзэл, цэцэн чадвар, амин хүч, том алсын хараа',
  snake: 'мэргэн ухаан, зөн совин, гүн гүнзгий байдал, тайван тогтуун зан',
  horse: 'эрч хүч, эрх чөлөө, урам зориг, бие даасан байдал',
  goat: 'энэрэл, бүтээлч чанар, өрөвч сэтгэл, тайван байдал',
  monkey: 'ухаалаг зан, сониуч байдал, олон талт чадвар, хошин шог',
  rooster: 'нямбай байдал, үнэнч шударга, өөртөө итгэх итгэл, шаргуу хөдөлмөр',
  dog: 'үнэнч байдал, шударга ёс, хамгаалах сэтгэл, чин сэтгэл',
  pig: 'өгөөмөр сэтгэл, чин үнэнч байдал, өөдрөг үзэл, дулаан зан',
};
const ESSENCE_EN: Record<ChineseAnimal, string> = {
  rat: 'resourcefulness, quick wit, adaptability, charm',
  ox: 'diligence, reliability, patience, quiet strength',
  tiger: 'courage, confidence, leadership, bold drive',
  rabbit: 'gentleness, diplomacy, sensitivity, grace',
  dragon: 'ambition, charisma, vitality, big vision',
  snake: 'wisdom, intuition, depth, composure',
  horse: 'energy, freedom, enthusiasm, independence',
  goat: 'kindness, creativity, empathy, calm',
  monkey: 'cleverness, curiosity, versatility, humor',
  rooster: 'precision, honesty, confidence, hard work',
  dog: 'loyalty, fairness, protectiveness, sincerity',
  pig: 'generosity, sincerity, optimism, warmth',
};

interface RawReading {
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
}

interface AnthropicMessageResponse {
  content?: Array<{ type: string; text?: string }>;
}

function buildDailyPrompt(animal: ChineseAnimal, dateISO: string, lang: Lang): { system: string; user: string } {
  const info = getChineseAnimalInfo(animal);

  if (lang === 'mn') {
    const name = MN_ANIMAL_NAMES[animal];
    return {
      system:
        'Чи туршлагатай, дулаахан, урам зориг өгдөг Зүүн Азийн (Хятад-Монголын) жилийн зурхайч. ' +
        'Хэрэглэгчдэд жилийн (амьтны) орд тус бүрээр өдөр тутмын ангилсан зурхай бичиж өгдөг. ' +
        'Бүх агуулгыг байгалийн, уран яруу, ойлгомжтой монгол хэлээр (кирилл үсгээр) бич. ' +
        'Зөвхөн өргөн хэрэглээний, амьд ярианы монгол үг хэллэг ашигла — махчилсан орчуулга, ' +
        'зохиомол үг огт бүү хэрэглэ. Уншигчид та гэж шууд хандаж бич. ' +
        'ХАМГИЙН ЧУХАЛ: Жил бүр өөрийн гэсэн өвөрмөц зан чанартай. Тайлал чинь ЗӨВХӨН тухайн ' +
        'амьтны жилд л тохирох ёстой — бүх жилд адилхан тохирох ерөнхий зөвлөгөө бүү бич. ' +
        'Хариултаа ЗӨВХӨН доор тайлбарласан JSON объект хэлбэрээр буцаа — өөр ямар ч текст бүү нэм.',
      user:
        `Огноо: ${dateISO}\n` +
        `Жилийн орд: ${name} жил (${MN_ELEMENT[info.fixedElement]} махбод, ${info.yinYang === 'yang' ? 'эр' : 'эм'} чанар)\n` +
        `Гол шинж: ${ESSENCE_MN[animal]}.\n\n` +
        `Доорх талбар бүрийг ЗӨВХӨН ${name} жилийн дээрх гол шинжид нааж, бусад жилээс тод ялгаатай, ` +
        'тус бүр 4-6 өгүүлбэртэй бүтэн догол мөр болгож доорх JSON бүтцээр буцаа:\n' +
        '{\n' +
        '  "overall": "тухайн өдрийн ерөнхий байдал",\n' +
        '  "love": "хайр дурлал, харилцаа",\n' +
        '  "career": "ажил мэргэжил, санхүү",\n' +
        '  "health": "эрүүл мэнд, тэнхээ",\n' +
        '  "luckyNumber": 1-99 хооронд бүхэл азын тоо,\n' +
        '  "luckyColor": "азын өнгө (монголоор)"\n' +
        '}',
    };
  }

  const name = EN_ANIMAL_NAMES[animal];
  return {
    system:
      'You are an experienced, warm, encouraging Chinese zodiac astrologer who writes daily ' +
      'horoscopes for each animal year, broken into categories. Write natural, vivid, specific ' +
      'English — avoid generic, empty, or repetitive filler. ' +
      'CRITICAL: each animal has a distinct archetype; the reading must fit ONLY this animal and ' +
      'must never be generic advice that would fit any animal. Anchor every sentence to this ' +
      "animal's specific nature. Respond with ONLY the JSON object described below and no other text.",
    user:
      `Date: ${dateISO}\n` +
      `Animal year: ${name} (${EN_ELEMENT[info.fixedElement]} element, ${info.yinYang})\n` +
      `Core traits: ${ESSENCE_EN[animal]}.\n\n` +
      `Ground every section in the ${name}'s specific nature and core traits, clearly different ` +
      'from other animals. Write a rich, varied paragraph of 4-6 sentences for each field and ' +
      'return exactly this JSON shape:\n' +
      '{\n' +
      '  "overall": "general outlook for the day",\n' +
      '  "love": "love and relationships",\n' +
      '  "career": "career and finances",\n' +
      '  "health": "health and energy",\n' +
      '  "luckyNumber": an integer between 1 and 99,\n' +
      '  "luckyColor": "a lucky color"\n' +
      '}',
  };
}

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Monday of an ISO week key ('YYYY-Www'), as a UTC date. */
function isoWeekMonday(periodKey: string): Date {
  const [yearPart, weekPart] = periodKey.split('-W');
  const year = Number(yearPart);
  const week = Number(weekPart);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = jan4.getUTCDay() || 7;
  const week1Monday = new Date(Date.UTC(year, 0, 4 - (jan4Dow - 1)));
  week1Monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return week1Monday;
}

function periodLabel(periodType: PeriodType, periodKey: string, lang: Lang): string {
  if (periodType === 'yearly') {
    return lang === 'mn' ? `${periodKey} он` : `the year ${periodKey}`;
  }
  if (periodType === 'weekly') {
    const start = isoWeekMonday(periodKey);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const sM = start.getUTCMonth();
    const sD = start.getUTCDate();
    const eM = end.getUTCMonth();
    const eD = end.getUTCDate();
    const sY = start.getUTCFullYear();
    if (lang === 'mn') {
      return sM === eM
        ? `${sY} оны ${sM + 1}-р сарын ${sD}–${eD}-ны долоо хоног`
        : `${sY} оны ${sM + 1}-р сарын ${sD} – ${eM + 1}-р сарын ${eD}-ны долоо хоног`;
    }
    return sM === eM
      ? `the week of ${MONTHS_EN[sM]} ${sD}–${eD}, ${sY}`
      : `the week of ${MONTHS_EN[sM]} ${sD} – ${MONTHS_EN[eM]} ${eD}, ${sY}`;
  }
  const [year, month] = periodKey.split('-');
  const monthIdx = Math.max(0, Math.min(11, Number(month) - 1));
  return lang === 'mn' ? `${year} оны ${Number(month)}-р сар` : `${MONTHS_EN[monthIdx]} ${year}`;
}

function buildPeriodPrompt(
  animal: ChineseAnimal,
  periodType: PeriodType,
  periodKey: string,
  lang: Lang,
): { system: string; user: string } {
  const info = getChineseAnimalInfo(animal);
  const label = periodLabel(periodType, periodKey, lang);

  if (lang === 'mn') {
    const name = MN_ANIMAL_NAMES[animal];
    const scope = periodType === 'yearly' ? 'жилийн' : periodType === 'weekly' ? 'долоо хоногийн' : 'сарын';
    return {
      system:
        'Чи туршлагатай, дулаахан, урам зориг өгдөг Зүүн Азийн жилийн зурхайч. ' +
        `Хэрэглэгчдэд жилийн орд тус бүрээр ${scope} ангилсан зурхай бичиж өгдөг. ` +
        'Бүх агуулгыг байгалийн, уран яруу монгол хэлээр (кирилл үсгээр) бич. ' +
        'Бүх хугацааг бүхэлд нь хамарсан ерөнхий чиг хандлагыг харуул — нэг өдрийн тухай биш. ' +
        'Хариултаа ЗӨВХӨН доор тайлбарласан JSON объект хэлбэрээр буцаа — өөр ямар ч текст бүү нэм.',
      user:
        `Хугацаа: ${label}\n` +
        `Жилийн орд: ${name} жил\n` +
        `Гол шинж: ${ESSENCE_MN[animal]}.\n\n` +
        `Дараах талбар бүрд ${scope} чиг хандлагыг баялаг, тус бүр 6-7 өгүүлбэртэй догол мөрөөр доорх JSON бүтцээр буцаа:\n` +
        '{\n' +
        '  "overall": "ерөнхий чиг хандлага",\n' +
        '  "love": "хайр дурлал, харилцаа",\n' +
        '  "career": "ажил мэргэжил, санхүү",\n' +
        '  "health": "эрүүл мэнд, тэнхээ",\n' +
        '  "luckyNumber": 1-99 хооронд бүхэл азын тоо,\n' +
        '  "luckyColor": "азын өнгө (монголоор)"\n' +
        '}',
    };
  }

  const name = EN_ANIMAL_NAMES[animal];
  const scope = periodType;
  return {
    system:
      'You are an experienced, warm Chinese zodiac astrologer who writes ' +
      `${scope} horoscopes for each animal year, broken into categories. Write natural, vivid, ` +
      'specific English — cover the overall trend across the whole period, not a single day. ' +
      'Respond with ONLY the JSON object described below and no other text.',
    user:
      `Period: ${label}\n` +
      `Animal year: ${name} (${EN_ELEMENT[info.fixedElement]} element)\n` +
      `Core traits: ${ESSENCE_EN[animal]}.\n\n` +
      `Write a rich, varied paragraph of 6-7 sentences of ${scope} outlook for each field and return exactly this JSON shape:\n` +
      '{\n' +
      '  "overall": "general outlook for the period",\n' +
      '  "love": "love and relationships",\n' +
      '  "career": "career and finances",\n' +
      '  "health": "health and energy",\n' +
      '  "luckyNumber": an integer between 1 and 99,\n' +
      '  "luckyColor": "a lucky color"\n' +
      '}',
  };
}

function extractJson(text: string): RawReading {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in Claude response');
  }
  return JSON.parse(text.slice(start, end + 1)) as RawReading;
}

function clampLuckyNumber(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 8;
  return Math.min(99, Math.max(1, n));
}

const MAX_ATTEMPTS = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  return 800 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
}

/** Shared Messages API call + JSON parse with retries on 429/5xx/network errors. */
async function requestClaude(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<ChineseReadingContent> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      await sleep(backoffMs(attempt));
      continue;
    }

    if (res.ok) {
      const data = (await res.json()) as AnthropicMessageResponse;
      const text = (data.content ?? [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('');
      let raw: RawReading;
      try {
        raw = extractJson(text);
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) throw err;
        await sleep(backoffMs(attempt));
        continue;
      }
      return {
        overall: String(raw.overall ?? '').trim(),
        love: String(raw.love ?? '').trim(),
        career: String(raw.career ?? '').trim(),
        health: String(raw.health ?? '').trim(),
        luckyNumber: clampLuckyNumber(raw.luckyNumber),
        luckyColor: String(raw.luckyColor ?? '').trim(),
      };
    }

    const retryable = res.status === 429 || res.status >= 500;
    const body = await res.text().catch(() => '<unreadable body>');
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 500)}`);
    }
    const retryAfter = Number(res.headers.get('retry-after'));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs(attempt);
    await sleep(delayMs);
  }

  throw new Error('Anthropic API: exhausted retries');
}

export function generateChineseDailyWithClaude(
  apiKey: string,
  animal: ChineseAnimal,
  dateISO: string,
  lang: Lang,
): Promise<ChineseReadingContent> {
  const { system, user } = buildDailyPrompt(animal, dateISO, lang);
  return requestClaude(apiKey, DAILY_MODEL, system, user, 2500);
}

export function generateChinesePeriodWithClaude(
  apiKey: string,
  animal: ChineseAnimal,
  periodType: PeriodType,
  periodKey: string,
  lang: Lang,
): Promise<ChineseReadingContent> {
  const { system, user } = buildPeriodPrompt(animal, periodType, periodKey, lang);
  return requestClaude(apiKey, PERIOD_MODEL, system, user, 3000);
}

// === Read path ===

export interface ChineseDailyResponse {
  animal: ChineseAnimal;
  date: string;
  lang: Lang;
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
}

export interface ChinesePeriodResponse {
  animal: ChineseAnimal;
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

function mapDaily(row: typeof chineseDailyHoroscopes.$inferSelect): ChineseDailyResponse {
  return {
    animal: row.animal as ChineseAnimal,
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

export async function getOrCreateChineseDaily(
  db: DB,
  animal: ChineseAnimal,
  lang: Lang,
  dateISO?: string,
  timezone?: string,
): Promise<ChineseDailyResponse> {
  const date = dateISO ?? safeDateISO(timezone);
  const existing = await db
    .select()
    .from(chineseDailyHoroscopes)
    .where(
      and(
        eq(chineseDailyHoroscopes.animal, animal),
        eq(chineseDailyHoroscopes.date, date),
        eq(chineseDailyHoroscopes.lang, lang),
      ),
    )
    .get();
  if (existing) return mapDaily(existing);

  // Requested language has no row — serve the canonical Claude copy in a generated
  // language (Mongolian) rather than a generic template for an English-UI user.
  for (const genLang of GENERATED_LANGS) {
    if (genLang === lang) continue;
    const genRow = await db
      .select()
      .from(chineseDailyHoroscopes)
      .where(
        and(
          eq(chineseDailyHoroscopes.animal, animal),
          eq(chineseDailyHoroscopes.date, date),
          eq(chineseDailyHoroscopes.lang, genLang),
        ),
      )
      .get();
    if (genRow) return mapDaily(genRow);
  }

  // Reader's local day may be ahead of the cron prewarm — serve the most recent stored
  // reading within a short look-back, relabeled to the requested date.
  const fallbackCutoff = subtractDaysISO(date, MAX_READING_FALLBACK_DAYS);
  const recentRow = await db
    .select()
    .from(chineseDailyHoroscopes)
    .where(
      and(
        eq(chineseDailyHoroscopes.animal, animal),
        inArray(chineseDailyHoroscopes.lang, [...GENERATED_LANGS]),
        lte(chineseDailyHoroscopes.date, date),
        gte(chineseDailyHoroscopes.date, fallbackCutoff),
      ),
    )
    .orderBy(desc(chineseDailyHoroscopes.date))
    .get();
  if (recentRow) return { ...mapDaily(recentRow), date };

  // Nothing stored yet — ephemeral template reading, NOT persisted (so the next prewarm
  // writes the real Claude row).
  const generated = generateChineseReading(animal, date, lang);
  return { animal, date, lang, ...generated };
}

function mapPeriod(row: typeof chinesePeriodHoroscopes.$inferSelect): ChinesePeriodResponse {
  return {
    animal: row.animal as ChineseAnimal,
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

export async function getOrCreateChinesePeriod(
  db: DB,
  animal: ChineseAnimal,
  periodType: PeriodType,
  periodKey: string,
  lang: Lang,
): Promise<ChinesePeriodResponse> {
  const existing = await db
    .select()
    .from(chinesePeriodHoroscopes)
    .where(
      and(
        eq(chinesePeriodHoroscopes.animal, animal),
        eq(chinesePeriodHoroscopes.periodType, periodType),
        eq(chinesePeriodHoroscopes.periodKey, periodKey),
        eq(chinesePeriodHoroscopes.lang, lang),
      ),
    )
    .get();
  if (existing) return mapPeriod(existing);

  for (const genLang of GENERATED_LANGS) {
    if (genLang === lang) continue;
    const genRow = await db
      .select()
      .from(chinesePeriodHoroscopes)
      .where(
        and(
          eq(chinesePeriodHoroscopes.animal, animal),
          eq(chinesePeriodHoroscopes.periodType, periodType),
          eq(chinesePeriodHoroscopes.periodKey, periodKey),
          eq(chinesePeriodHoroscopes.lang, genLang),
        ),
      )
      .get();
    if (genRow) return mapPeriod(genRow);
  }

  const content = generateChineseReading(animal, periodKey, lang);
  return { animal, periodType, periodKey, lang, ...content };
}

// === Prewarm (cron / admin) ===

export interface ChinesePrewarmResult {
  scope: string;
  generated: number;
  skipped: number;
  total: number;
  failed: number;
  aiGenerated: number;
  fallback: number;
}

export async function prewarmChineseDaily(
  db: DB,
  dateISO: string,
  apiKey?: string,
  force = false,
): Promise<ChinesePrewarmResult> {
  let generated = 0, skipped = 0, failed = 0, aiGenerated = 0, fallback = 0;
  const langs = GENERATED_LANGS as readonly Lang[];

  for (const animal of ANIMAL_ORDER) {
    for (const lang of langs) {
      try {
        if (!force) {
          const exists = await db
            .select({ id: chineseDailyHoroscopes.id })
            .from(chineseDailyHoroscopes)
            .where(
              and(
                eq(chineseDailyHoroscopes.animal, animal),
                eq(chineseDailyHoroscopes.date, dateISO),
                eq(chineseDailyHoroscopes.lang, lang),
              ),
            )
            .get();
          if (exists) { skipped += 1; continue; }
        }

        let content: ChineseReadingContent;
        let fromAi = false;
        if (apiKey) {
          try {
            content = await generateChineseDailyWithClaude(apiKey, animal, dateISO, lang);
            aiGenerated += 1;
            fromAi = true;
          } catch (err) {
            log({}, 'error', 'cron_chinese_daily_claude_failed', { animal, lang, dateISO, error: String(err) });
            content = generateChineseReading(animal, dateISO, lang);
            fallback += 1;
          }
        } else {
          content = generateChineseReading(animal, dateISO, lang);
          fallback += 1;
        }

        const insert = db.insert(chineseDailyHoroscopes).values({
          id: crypto.randomUUID(),
          animal,
          date: dateISO,
          lang,
          ...content,
        });
        if (force && fromAi) {
          await insert.onConflictDoUpdate({
            target: [chineseDailyHoroscopes.animal, chineseDailyHoroscopes.date, chineseDailyHoroscopes.lang],
            set: { ...content },
          });
        } else {
          await insert.onConflictDoNothing();
        }
        generated += 1;
      } catch (err) {
        failed += 1;
        log({}, 'error', 'cron_chinese_daily_prewarm_item_failed', { animal, lang, dateISO, error: err });
      }
    }
  }

  return { scope: `daily:${dateISO}`, generated, skipped, total: ANIMAL_ORDER.length * langs.length, failed, aiGenerated, fallback };
}

export async function prewarmChinesePeriod(
  db: DB,
  periodType: PeriodType,
  periodKey: string,
  apiKey?: string,
  force = false,
): Promise<ChinesePrewarmResult> {
  let generated = 0, skipped = 0, failed = 0, aiGenerated = 0, fallback = 0;
  const langs = GENERATED_LANGS as readonly Lang[];

  for (const animal of ANIMAL_ORDER) {
    for (const lang of langs) {
      try {
        if (!force) {
          const exists = await db
            .select({ id: chinesePeriodHoroscopes.id })
            .from(chinesePeriodHoroscopes)
            .where(
              and(
                eq(chinesePeriodHoroscopes.animal, animal),
                eq(chinesePeriodHoroscopes.periodType, periodType),
                eq(chinesePeriodHoroscopes.periodKey, periodKey),
                eq(chinesePeriodHoroscopes.lang, lang),
              ),
            )
            .get();
          if (exists) { skipped += 1; continue; }
        }

        let content: ChineseReadingContent;
        let fromAi = false;
        if (apiKey) {
          try {
            content = await generateChinesePeriodWithClaude(apiKey, animal, periodType, periodKey, lang);
            aiGenerated += 1;
            fromAi = true;
          } catch (err) {
            log({}, 'error', 'cron_chinese_period_claude_failed', { animal, lang, periodType, periodKey, error: String(err) });
            content = generateChineseReading(animal, periodKey, lang);
            fallback += 1;
          }
        } else {
          content = generateChineseReading(animal, periodKey, lang);
          fallback += 1;
        }

        const insert = db.insert(chinesePeriodHoroscopes).values({
          id: crypto.randomUUID(),
          animal,
          periodType,
          periodKey,
          lang,
          ...content,
        });
        if (force && fromAi) {
          await insert.onConflictDoUpdate({
            target: [
              chinesePeriodHoroscopes.animal,
              chinesePeriodHoroscopes.periodType,
              chinesePeriodHoroscopes.periodKey,
              chinesePeriodHoroscopes.lang,
            ],
            set: { ...content },
          });
        } else {
          await insert.onConflictDoNothing();
        }
        generated += 1;
      } catch (err) {
        failed += 1;
        log({}, 'error', 'cron_chinese_period_prewarm_item_failed', { animal, lang, periodType, periodKey, error: err });
      }
    }
  }

  return { scope: `${periodType}:${periodKey}`, generated, skipped, total: ANIMAL_ORDER.length * langs.length, failed, aiGenerated, fallback };
}
