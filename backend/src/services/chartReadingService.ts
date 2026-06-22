import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { chartReadings } from '../db/schema';
import type { Lang } from '../utils/lang';

/**
 * Generates a personalized natal-chart reading with Claude, grounded in the user's
 * own planetary placements + aspects (unlike the daily horoscope, which is per-sign).
 *
 * A birth chart never changes, so the reading is generated exactly once per chart and
 * cached in `chart_readings` (keyed by a hash of the chart + lang). There is no
 * regenerate — the only way a new one is produced is if the user corrects their birth
 * data, which changes the chart hash. Direct `fetch` to the Messages API (same pattern
 * as claudeHoroscopeService) — lighter in Workers and surfaces the real error body.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
// Premium, on-demand, generated once per user — quality matters more than cost/latency here,
// so this uses the most capable model (the daily horoscope cron stays on Sonnet for volume).
const MODEL = 'claude-opus-4-8';

export interface ChartReadingContent {
  summary: string;
  strengths: string;
  challenges: string;
  relationships: string;
  career: string;
  growth: string;
}

interface PlanetPos {
  name: string;
  sign: string;
  degreeInSign: number;
  retrograde: boolean;
  house?: number;
}
interface Asp {
  body1: string;
  body2: string;
  type: string;
  orb: number;
}

/** The subset of a natal_charts row this service reads. */
export interface ChartInput {
  sunSign: string;
  moonSign: string;
  risingSign: string | null;
  planets: unknown;
  aspects: unknown;
}

const READING_FIELDS: Array<keyof ChartReadingContent> = [
  'summary',
  'strengths',
  'challenges',
  'relationships',
  'career',
  'growth',
];

/** Stable FNV-1a hash of the chart inputs → hex. A corrected birth chart yields a new hash. */
function hashChart(chart: ChartInput): string {
  const key = JSON.stringify({
    sun: chart.sunSign,
    moon: chart.moonSign,
    rising: chart.risingSign ?? null,
    planets: chart.planets,
    aspects: chart.aspects,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Human-readable block of the chart's placements + aspects, fed to the model. */
function describeChart(chart: ChartInput): string {
  const planets = Array.isArray(chart.planets) ? (chart.planets as PlanetPos[]) : [];
  const aspects = Array.isArray(chart.aspects) ? (chart.aspects as Asp[]) : [];

  const lines: string[] = [];
  lines.push(`Sun in ${cap(chart.sunSign)}`);
  lines.push(`Moon in ${cap(chart.moonSign)}`);
  lines.push(`Rising/Ascendant: ${chart.risingSign ? cap(chart.risingSign) : 'unknown'}`);
  lines.push('');
  lines.push('Planetary placements:');
  for (const p of planets) {
    const deg = Number.isFinite(p.degreeInSign) ? `${p.degreeInSign.toFixed(1)}°` : '';
    const house = p.house ? `, house ${p.house}` : '';
    const retro = p.retrograde ? ', retrograde' : '';
    lines.push(`- ${cap(p.name)} in ${cap(p.sign)} ${deg}${house}${retro}`);
  }
  if (aspects.length) {
    lines.push('');
    lines.push('Major aspects:');
    for (const a of aspects) {
      lines.push(`- ${cap(a.body1)} ${a.type} ${cap(a.body2)} (orb ${a.orb.toFixed(1)}°)`);
    }
  }
  return lines.join('\n');
}

function buildPrompt(chart: ChartInput, lang: Lang): { system: string; user: string } {
  const chartBlock = describeChart(chart);

  if (lang === 'mn') {
    return {
      system:
        'Чи туршлагатай, дулаахан мэргэжлийн зурхайч. Хүний төрсөн зурхайн (натал картын) гариг, ' +
        'аспектэд тулгуурлан зөвхөн ТУХАЙН хүнд зориулсан хувийн тайлал бичнэ. ' +
        'Бүх агуулгыг байгалийн, уран яруу, ойлгомжтой монгол хэлээр (кирилл үсгээр) бич. ' +
        'Зөвхөн өргөн хэрэглээний, амьд ярианы монгол үг хэллэг ашигла — махчилсан орчуулга, зохиомол үг бүү хэрэглэ. ' +
        'Уншигчид та гэж шууд хандаж бич. ХАМГИЙН ЧУХАЛ: өгүүлбэр болгоныг энэ хүний тодорхой гариг, ' +
        'аспектэд нааж, бусдад тохирохгүй өвөрмөц байдлаар бич — ерөнхий нарны ордын зөвлөгөө бүү бич. ' +
        'Хариултаа ЗӨВХӨН доор тайлбарласан JSON объект хэлбэрээр буцаа — өөр ямар ч текст бүү нэм.',
      user:
        `Энэ хүний төрсөн зурхай:\n${chartBlock}\n\n` +
        'Доорх талбар бүрийг энэ зурхайн гариг, аспектэд тулгуурлан, тус бүр 4-6 өгүүлбэртэй бүтэн ' +
        'догол мөрөөр бичиж, доорх JSON бүтцээр буцаа:\n' +
        '{\n' +
        '  "summary": "нар, сар, асцендентыг нэгтгэсэн зан чанарын ерөнхий дүр зураг",\n' +
        '  "strengths": "төрөлхийн давуу тал, авьяас",\n' +
        '  "challenges": "сорилт, анхаарах сул тал",\n' +
        '  "relationships": "хайр дурлал, харилцаа",\n' +
        '  "career": "ажил мэргэжил, дуудлага",\n' +
        '  "growth": "хувийн өсөлт, замчлал"\n' +
        '}',
    };
  }

  return {
    system:
      'You are an experienced, warm professional astrologer. You write a personalized natal-chart ' +
      "reading grounded in THIS person's specific planetary placements and aspects (not generic " +
      'sun-sign advice). Write natural, vivid, specific English. CRITICAL: anchor every sentence to ' +
      "this chart's actual placements and aspects — it must read uniquely for this person and never " +
      'be advice that would fit anyone. Respond with ONLY the JSON object described below and no other text.',
    user:
      `This person's natal chart:\n${chartBlock}\n\n` +
      'Write a rich, varied paragraph of 4-6 sentences for each field, grounded in the placements and ' +
      'aspects above, and return exactly this JSON shape:\n' +
      '{\n' +
      '  "summary": "core identity synthesizing Sun, Moon, and Rising",\n' +
      '  "strengths": "natural strengths and talents",\n' +
      '  "challenges": "challenges and growth edges",\n' +
      '  "relationships": "love and relationships",\n' +
      '  "career": "career and vocation",\n' +
      '  "growth": "personal growth and the path forward"\n' +
      '}',
  };
}

interface AnthropicMessageResponse {
  content?: Array<{ type: string; text?: string }>;
}

function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in Claude response');
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

const MAX_ATTEMPTS = 3;
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function backoffMs(attempt: number): number {
  return 800 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
}

async function generateWithClaude(apiKey: string, chart: ChartInput, lang: Lang): Promise<ChartReadingContent> {
  const { system, user } = buildPrompt(chart, lang);

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
          model: MODEL,
          max_tokens: 3500,
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
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('');
      let raw: Record<string, unknown>;
      try {
        raw = extractJson(text);
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) throw err;
        await sleep(backoffMs(attempt));
        continue;
      }
      const out = {} as ChartReadingContent;
      for (const f of READING_FIELDS) out[f] = String(raw[f] ?? '').trim();
      if (!out.summary) {
        if (attempt === MAX_ATTEMPTS) throw new Error('Claude returned an empty chart reading');
        await sleep(backoffMs(attempt));
        continue;
      }
      return out;
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

export interface ChartReadingResult {
  reading: ChartReadingContent;
  generated: boolean;
}

/**
 * Returns the stored reading for this chart + lang, or generates it once and persists it.
 * Enforces "one generation per birth chart" via the unique (user, chartHash, lang) cache.
 */
export async function getOrGenerateChartReading(
  db: DB,
  userId: string,
  chart: ChartInput,
  lang: Lang,
  apiKey: string,
): Promise<ChartReadingResult> {
  const chartHash = hashChart(chart);

  const existing = await db
    .select()
    .from(chartReadings)
    .where(and(eq(chartReadings.userId, userId), eq(chartReadings.chartHash, chartHash), eq(chartReadings.lang, lang)))
    .get();
  if (existing) {
    return { reading: existing.contentJson as ChartReadingContent, generated: false };
  }

  const reading = await generateWithClaude(apiKey, chart, lang);

  await db
    .insert(chartReadings)
    .values({ id: crypto.randomUUID(), userId, chartHash, lang, contentJson: reading })
    .onConflictDoNothing();

  return { reading, generated: true };
}
