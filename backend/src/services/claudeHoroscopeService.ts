import type { ZodiacSign } from '../utils/zodiac';
import { getZodiacInfo } from '../utils/zodiac';
import type { Lang } from '../utils/lang';
import type { DailyHoroscopeContent } from '../utils/horoscopeTemplates';

/**
 * Generates the daily horoscope text with Claude Sonnet instead of the static
 * templates. Used by the 1am cron prewarm so every sign+lang row stored in D1 is
 * model-written. The read path still serves straight from D1 and falls back to
 * templates if a row is missing, so a Claude outage never reaches the user.
 *
 * Uses a direct `fetch` to the Messages API (not the SDK) — lighter in the
 * Workers runtime and, crucially, surfaces the real API error body on failure.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
// Readings are generated once per period by the cron and served from D1, so model
// choice is purely a text-quality decision — latency never reaches users. Mongolian
// (the primary language) needs Sonnet-tier fluency: Haiku invents words and produces
// literal-translation calques. Don't change these without asking.
const DAILY_MODEL = 'claude-sonnet-4-6';
const WEEKLY_MODEL = 'claude-sonnet-4-6';
const PERIOD_MODEL = 'claude-sonnet-4-6';

/** Mongolian zodiac names — Mongolian is the primary language for this app. */
const MN_SIGN_NAMES: Record<ZodiacSign, string> = {
  aries: 'Хонь',
  taurus: 'Үхэр',
  gemini: 'Ихэр',
  cancer: 'Мэлхий',
  leo: 'Арслан',
  virgo: 'Охин',
  libra: 'Жинлүүр',
  scorpio: 'Хилэнц',
  sagittarius: 'Нум',
  capricorn: 'Матар',
  aquarius: 'Хумх',
  pisces: 'Загас',
};

/** Per-sign distinguishing context fed to the model so each sign reads differently. */
const MN_ELEMENT: Record<string, string> = { fire: 'галт', earth: 'шороон', air: 'агаарын', water: 'усан' };
const MN_MODALITY: Record<string, string> = {
  cardinal: 'манлайлагч (эхлэл тавьдаг)',
  fixed: 'тогтвортой (бат барьдаг)',
  mutable: 'уян хатан (дасан зохицдог)',
};
const SIGN_ESSENCE_MN: Record<ZodiacSign, string> = {
  aries: 'эрч хүч, зориг, шууд үйлдэл, тэргүүлэх тэмүүлэл',
  taurus: 'тогтвортой байдал, тэвчээр, материаллаг аюулгүй байдал, тав тух',
  gemini: 'сониуч зан, мэдээлэл солилцоо, санаа, ярианы уран чадвар',
  cancer: 'мэдрэмж, гэр бүл, харьяалагдах хүсэл, халамж',
  leo: 'бүтээлч чанар, өөртөө итгэх итгэл, нэр хүнд, өгөөмөр сэтгэл',
  virgo: 'нямбай байдал, шинжилгээ, үйлчлэл, өөрийгөө сайжруулах',
  libra: 'тэнцвэр, харилцаа, шударга ёс, гоо зүй',
  scorpio: 'гүн гүнзгий байдал, эрчим, итгэл, дотоод хувирал',
  sagittarius: 'эрх чөлөө, аялал, утга учир, өөдрөг үзэл',
  capricorn: 'сахилга бат, эрмэлзэл, бүтэц, хариуцлага',
  aquarius: 'шинэлэг сэтгэлгээ, бие даасан байдал, нийгэмлэг, үзэл санаа',
  pisces: 'уран сэтгэмж, энэрэл, зөн совин, мэдрэмтгий чанар',
};
const SIGN_ESSENCE_EN: Record<ZodiacSign, string> = {
  aries: 'initiative, courage, direct action, restlessness with delay',
  taurus: 'steadiness, patience, material security, sensual comfort',
  gemini: 'curiosity, communication, ideas, mental quickness',
  cancer: 'emotion, home, belonging, protectiveness',
  leo: 'creativity, confidence, recognition, generosity',
  virgo: 'precision, analysis, service, self-improvement',
  libra: 'balance, relationships, fairness, aesthetics',
  scorpio: 'depth, intensity, trust, transformation',
  sagittarius: 'freedom, exploration, meaning, optimism',
  capricorn: 'discipline, ambition, structure, responsibility',
  aquarius: 'innovation, independence, community, ideals',
  pisces: 'imagination, compassion, intuition, sensitivity',
};

interface RawHoroscope {
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

function buildPrompt(sign: ZodiacSign, dateISO: string, lang: Lang): { system: string; user: string } {
  const info = getZodiacInfo(sign);

  if (lang === 'mn') {
    const mnName = MN_SIGN_NAMES[sign];
    return {
      system:
        'Чи туршлагатай, дулаахан, урам зориг өгдөг мэргэжлийн зурхайч. ' +
        'Хэрэглэгчдэд өдөр тутмын ангилсан зурхай бичиж өгдөг. ' +
        'Бүх агуулгыг байгалийн, уран яруу, ойлгомжтой монгол хэлээр (кирилл үсгээр) бич. ' +
        'Зөвхөн өргөн хэрэглээний, амьд ярианы монгол үг хэллэг ашигла — махчилсан орчуулга, ' +
        'гадаад хэлний хуулбар хэллэг, зохиомол үг огт бүү хэрэглэ. ' +
        'Уншигчид та гэж шууд хандаж бич. Өгүүлбэрүүдээ өөр өөр бүтэцтэй, урсамтгай бич. ' +
        'Ерөнхий зөгнөл биш — өдөр тутмын амьдралд хэрэгжүүлж болох тодорхой, бодитой зөвлөгөө өг. ' +
        'ХАМГИЙН ЧУХАЛ: Орд бүр өөрийн гэсэн өвөрмөц зан чанартай. Тайлал чинь ЗӨВХӨН тухайн ордод л ' +
        'тохирох ёстой — бүх ордод адилхан тохирох ерөнхий зөвлөгөө (жишээ нь "хойшлуулсан ажлаа дуусга", ' +
        '"сонсох чадвараа ашигла", "импульсээ барь") бүү бич. Өгүүлбэр болгоныг тухайн ордын мөн чанарт нааш. ' +
        'Хариултаа ЗӨВХӨН доор тайлбарласан JSON объект хэлбэрээр буцаа — өөр ямар ч текст бүү нэм.',
      user:
        `Огноо: ${dateISO}\n` +
        `Орд: ${mnName} (${info.name})\n` +
        `Энэ ордын мөн чанар: ${MN_ELEMENT[info.element]} орд, ${MN_MODALITY[info.modality]} төлөв. ` +
        `Гол шинж: ${SIGN_ESSENCE_MN[sign]}.\n\n` +
        `Доорх талбар бүрийг ЗӨВХӨН ${mnName} ордын дээрх мөн чанар, гол шинжид нааж, бусад ороос тод ` +
        'ялгаатай, өвөрмөц байдлаар бич. Тус бүр 4-6 өгүүлбэртэй бүтэн догол мөр болгож доорх JSON бүтцээр буцаа:\n' +
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

  return {
    system:
      'You are an experienced, warm, encouraging professional astrologer who writes ' +
      'daily horoscopes broken into categories. Write natural, vivid, specific English — ' +
      'avoid generic, empty, or repetitive filler. ' +
      'CRITICAL: each sign has a distinct archetype; the reading must fit ONLY this sign and ' +
      'must never be generic advice that would fit any sign (e.g. "finish your postponed task", ' +
      '"use your listening skills"). Anchor every sentence to this sign\'s specific nature. ' +
      'Respond with ONLY the JSON object described below and no other text.',
    user:
      `Date: ${dateISO}\n` +
      `Sign: ${info.name} (${info.element} sign, ${info.modality} modality, ruled by ${info.rulingPlanet})\n` +
      `Core traits: ${SIGN_ESSENCE_EN[sign]}.\n\n` +
      `Ground every section in ${info.name}'s specific ${info.element}/${info.modality} nature and core ` +
      'traits, clearly different from other signs. Write a rich, varied paragraph of 4-6 sentences for ' +
      'each field and return exactly this JSON shape:\n' +
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

/** Defensively pull the JSON object out of the model response. */
function extractJson(text: string): RawHoroscope {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in Claude response');
  }
  return JSON.parse(text.slice(start, end + 1)) as RawHoroscope;
}

function clampLuckyNumber(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 7;
  return Math.min(99, Math.max(1, n));
}

/**
 * Calls Claude Sonnet and returns content shaped exactly like the template
 * generator (`DailyHoroscopeContent`), so the prewarm insert path is unchanged.
 * Throws (with the real API error body) on any failure — callers fall back to templates.
 */
const MAX_ATTEMPTS = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with jitter: ~0.8s, 1.6s, 3.2s. */
function backoffMs(attempt: number): number {
  return 800 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
}

/**
 * Shared Messages API call + JSON parse, used by daily and period generators.
 * Retries on 429 (rate limit), 5xx, and network errors so the daily/period
 * bursts of 24+ calls don't intermittently fall back to templates.
 */
async function requestClaudeHoroscope(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<DailyHoroscopeContent> {
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
      // Network/transport error — retry unless out of attempts.
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
      let raw: RawHoroscope;
      try {
        raw = extractJson(text);
      } catch (err) {
        // Malformed JSON (usually an unescaped quote in the prose) — a fresh
        // generation almost always parses, so retry instead of falling back.
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
    // Honor Retry-After when the API provides it, else exponential backoff.
    const retryAfter = Number(res.headers.get('retry-after'));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs(attempt);
    await sleep(delayMs);
  }

  throw new Error('Anthropic API: exhausted retries');
}

export async function generateDailyHoroscopeWithClaude(
  apiKey: string,
  sign: ZodiacSign,
  dateISO: string,
  lang: Lang,
): Promise<DailyHoroscopeContent> {
  const { system, user } = buildPrompt(sign, dateISO, lang);
  return requestClaudeHoroscope(apiKey, DAILY_MODEL, system, user, 2500);
}

export type PeriodType = 'weekly' | 'monthly' | 'yearly';

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Monday of an ISO week key ('YYYY-Www'), as a UTC date. ISO week 1 always contains Jan 4. */
function isoWeekMonday(periodKey: string): Date {
  const [yearPart, weekPart] = periodKey.split('-W');
  const year = Number(yearPart);
  const week = Number(weekPart);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = jan4.getUTCDay() || 7; // 1 = Monday … 7 = Sunday
  const week1Monday = new Date(Date.UTC(year, 0, 4 - (jan4Dow - 1)));
  week1Monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return week1Monday;
}

/** Human label for an ISO week, e.g. '2026-W24' -> 'the week of June 8–14, 2026'. */
function weekLabel(periodKey: string, lang: Lang): string {
  const start = isoWeekMonday(periodKey);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const sY = start.getUTCFullYear();
  const sM = start.getUTCMonth();
  const sD = start.getUTCDate();
  const eY = end.getUTCFullYear();
  const eM = end.getUTCMonth();
  const eD = end.getUTCDate();

  if (lang === 'mn') {
    if (sM === eM) return `${sY} оны ${sM + 1}-р сарын ${sD}–${eD}-ны долоо хоног`;
    if (sY === eY) return `${sY} оны ${sM + 1}-р сарын ${sD} – ${eM + 1}-р сарын ${eD}-ны долоо хоног`;
    return `${sY} оны ${sM + 1}-р сарын ${sD} – ${eY} оны ${eM + 1}-р сарын ${eD}-ны долоо хоног`;
  }

  if (sM === eM) return `the week of ${MONTHS_EN[sM]} ${sD}–${eD}, ${sY}`;
  if (sY === eY) return `the week of ${MONTHS_EN[sM]} ${sD} – ${MONTHS_EN[eM]} ${eD}, ${sY}`;
  return `the week of ${MONTHS_EN[sM]} ${sD}, ${sY} – ${MONTHS_EN[eM]} ${eD}, ${eY}`;
}

/** Human label for a period key, e.g. '2026-06' -> 'June 2026' / '2026 оны 6-р сар'. */
function periodLabel(periodType: PeriodType, periodKey: string, lang: Lang): string {
  if (periodType === 'yearly') {
    return lang === 'mn' ? `${periodKey} он` : `the year ${periodKey}`;
  }
  if (periodType === 'weekly') {
    return weekLabel(periodKey, lang);
  }
  // monthly: 'YYYY-MM'
  const [year, month] = periodKey.split('-');
  const monthIdx = Math.max(0, Math.min(11, Number(month) - 1));
  return lang === 'mn' ? `${year} оны ${Number(month)}-р сар` : `${MONTHS_EN[monthIdx]} ${year}`;
}

function buildPeriodPrompt(
  sign: ZodiacSign,
  periodType: PeriodType,
  periodKey: string,
  lang: Lang,
): { system: string; user: string } {
  const info = getZodiacInfo(sign);
  const label = periodLabel(periodType, periodKey, lang);

  if (lang === 'mn') {
    const mnName = MN_SIGN_NAMES[sign];
    const scope = periodType === 'yearly' ? 'жилийн' : periodType === 'weekly' ? 'долоо хоногийн' : 'сарын';
    return {
      system:
        'Чи туршлагатай, дулаахан, урам зориг өгдөг мэргэжлийн зурхайч. ' +
        `Хэрэглэгчдэд ${scope} ангилсан зурхай бичиж өгдөг. ` +
        'Бүх агуулгыг байгалийн, уран яруу, ойлгомжтой монгол хэлээр (кирилл үсгээр) бич. ' +
        'Зөвхөн өргөн хэрэглээний, амьд ярианы монгол үг хэллэг ашигла — махчилсан орчуулга, ' +
        'гадаад хэлний хуулбар хэллэг, зохиомол үг огт бүү хэрэглэ. ' +
        'Уншигчид та гэж шууд хандаж бич. Өгүүлбэрүүдээ өөр өөр бүтэцтэй, урсамтгай бич. ' +
        'Бүх хугацааг бүхэлд нь хамарсан, ерөнхий чиг хандлагыг харуул — нэг өдрийн тухай биш. ' +
        'Ерөнхий зөгнөл биш — амьдралд хэрэгжүүлж болох тодорхой, бодитой зөвлөгөө өг. ' +
        'Хэт ерөнхий, хоосон, давтагдсан хэллэгээс зайлсхий. ' +
        'Хариултаа ЗӨВХӨН доор тайлбарласан JSON объект хэлбэрээр буцаа — өөр ямар ч текст бүү нэм.',
      user:
        `Хугацаа: ${label}\n` +
        `Орд: ${mnName} (${info.name})\n\n` +
        `Дараах талбар бүрд ${scope} чиг хандлагыг баялаг, давтагдашгүй, тус бүр 6-7 өгүүлбэртэй бүтэн догол мөрөөр бичиж, доорх JSON бүтцээр буцаа:\n` +
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

  const scope = periodType === 'yearly' ? 'yearly' : periodType === 'weekly' ? 'weekly' : 'monthly';
  return {
    system:
      'You are an experienced, warm, encouraging professional astrologer who writes ' +
      `${scope} horoscopes broken into categories. Write natural, vivid, specific English — ` +
      'cover the overall trend across the whole period, not a single day. ' +
      'Avoid generic, empty, or repetitive filler. ' +
      'Respond with ONLY the JSON object described below and no other text.',
    user:
      `Period: ${label}\n` +
      `Sign: ${info.name} (${info.element} sign, ruled by ${info.rulingPlanet})\n\n` +
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

export async function generatePeriodHoroscopeWithClaude(
  apiKey: string,
  sign: ZodiacSign,
  periodType: PeriodType,
  periodKey: string,
  lang: Lang,
): Promise<DailyHoroscopeContent> {
  const { system, user } = buildPeriodPrompt(sign, periodType, periodKey, lang);
  // Weekly runs every week, so it uses the cheaper Haiku; monthly/yearly stay on Sonnet.
  // All periods ask for 6-7 sentences per field, so they all get a generous budget —
  // Mongolian Cyrillic is token-heavy and a truncated JSON response fails the parse.
  const model = periodType === 'weekly' ? WEEKLY_MODEL : PERIOD_MODEL;
  return requestClaudeHoroscope(apiKey, model, system, user, 3000);
}
