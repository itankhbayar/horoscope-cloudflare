/**
 * Phase 1 deterministic tarot engine (data-driven templates).
 * Phase 2: replace body of `generateTarotReading` with AI + retry + this module as fallback,
 * keeping `validateTarotPayload` as the persistence gatekeeper.
 */
import type { ZodiacSign } from '../utils/zodiac';
import { TAROT_COPY_REV } from './tarotCopyRev';
import type { TarotGeneratorResult, TarotPersistedPayload } from './tarotTypes';
import { validateTarotPayload } from './tarotValidator';
import { seedUint32, tarotSeedBytes } from './tarotSeed';
import cardsJson from '../../data/cards.json';
import moodsJson from '../../data/moods.json';
import templatesJson from '../../data/templates.json';

interface CardEntry {
  name: { en: string; mn: string };
  core_meaning: { en: string; mn: string };
}

interface Bilingual {
  en: string;
  mn: string;
}

interface TemplatesFile {
  overview: Bilingual[];
  love: Bilingual[];
  career: Bilingual[];
  energy: Bilingual[];
}

const cards = cardsJson as { major: CardEntry[]; minor: CardEntry[] };
const moods = moodsJson as { moods: Bilingual[]; keywords: Bilingual[]; themes: Bilingual[] };
const templates = templatesJson as TemplatesFile;

function applyTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(val);
  }
  return out;
}

function pickDistinctKeywordIndices(bytes: Uint8Array, count: number): number[] {
  const pool = moods.keywords.length;
  const used = new Set<number>();
  let slot = 3;
  while (used.size < count) {
    const idx = seedUint32(bytes, slot) % pool;
    slot += 1;
    if (!used.has(idx)) used.add(idx);
  }
  return [...used];
}

/**
 * Deterministic reading: same `sign + date + timezone` always yields identical JSON.
 */
export async function generateTarotReading(
  sign: ZodiacSign,
  date: string,
  timezone: string,
): Promise<TarotGeneratorResult> {
  const bytes = await tarotSeedBytes(sign, date, timezone);

  const major = cards.major;
  const minor = cards.minor;
  const totalCards = major.length + minor.length;
  const cardIndex = seedUint32(bytes, 0) % totalCards;
  const isMajor = cardIndex < major.length;
  const card: CardEntry = isMajor ? major[cardIndex]! : minor[cardIndex - major.length]!;

  const upright = (seedUint32(bytes, 1) & 1) === 0;
  const orientation = upright ? 'Upright' : 'Reversed';
  const arcana = isMajor ? 'Major' : 'Minor';

  const mood = moods.moods[seedUint32(bytes, 2) % moods.moods.length]!;
  const theme = moods.themes[seedUint32(bytes, 7) % moods.themes.length]!;
  const [ki1, ki2, ki3] = pickDistinctKeywordIndices(bytes, 3);
  const kw1 = moods.keywords[ki1]!;
  const kw2 = moods.keywords[ki2]!;
  const kw3 = moods.keywords[ki3]!;

  const orientationEn = orientation;
  const orientationMn = upright ? 'Эгц' : 'Урвуу';

  const varsEn: Record<string, string> = {
    sign,
    date,
    timezone,
    card: card.name.en.trim(),
    orientation: orientationEn,
    theme: theme.en,
    mood: mood.en,
    kw1: kw1.en,
    kw2: kw2.en,
    kw3: kw3.en,
  };
  const varsMn: Record<string, string> = {
    sign,
    date,
    timezone,
    card: card.name.mn.trim(),
    orientation: orientationMn,
    theme: theme.mn,
    mood: mood.mn,
    kw1: kw1.mn,
    kw2: kw2.mn,
    kw3: kw3.mn,
  };

  const pickTpl = (arr: Bilingual[], slot: number): Bilingual => {
    const i = seedUint32(bytes, slot) % arr.length;
    return arr[i]!;
  };

  const overviewTpl = pickTpl(templates.overview, 20);
  const loveTpl = pickTpl(templates.love, 21);
  const careerTpl = pickTpl(templates.career, 22);
  const energyTpl = pickTpl(templates.energy, 23);

  const payload: TarotPersistedPayload = {
    copyRev: TAROT_COPY_REV,
    date,
    timezone,
    sign,
    card_of_the_day: {
      name: { en: card.name.en.trim(), mn: card.name.mn.trim() },
      arcana,
      orientation,
      core_meaning: { en: card.core_meaning.en.trim(), mn: card.core_meaning.mn.trim() },
    },
    reading: {
      overview: {
        en: applyTemplate(overviewTpl.en, varsEn).trim(),
        mn: applyTemplate(overviewTpl.mn, varsMn).trim(),
      },
      love: {
        en: applyTemplate(loveTpl.en, varsEn).trim(),
        mn: applyTemplate(loveTpl.mn, varsMn).trim(),
      },
      career: {
        en: applyTemplate(careerTpl.en, varsEn).trim(),
        mn: applyTemplate(careerTpl.mn, varsMn).trim(),
      },
      energy: {
        en: applyTemplate(energyTpl.en, varsEn).trim(),
        mn: applyTemplate(energyTpl.mn, varsMn).trim(),
      },
    },
  };

  const energyScore = (bytes[bytes.length - 1] ?? 0) % 101;

  const validated = validateTarotPayload(payload);
  if (!validated.ok) {
    throw new Error(`Tarot generation failed validation: ${validated.error}`);
  }

  return { payload: validated.value, energyScore };
}
