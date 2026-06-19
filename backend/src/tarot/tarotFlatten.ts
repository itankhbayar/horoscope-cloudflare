import type { Lang } from '../utils/lang';
import type { TarotApiResponse, TarotLocaleText, TarotPersistedPayload } from './tarotTypes';
import tarotCardsJson from '../../data/tarot_cards.json';

function pickLang(block: TarotLocaleText, lang: Lang): string {
  return lang === 'mn' ? block.mn : block.en;
}

function pickLangList(block: { en: string[]; mn: string[] } | undefined, lang: Lang): string[] {
  if (!block) return [];
  return lang === 'mn' ? block.mn : block.en;
}

/** Static, per-card metadata as authored in tarot_cards.json (the source of truth). */
interface SourceCard {
  arcana: 'Major' | 'Minor';
  image: string;
  name: TarotLocaleText;
  core_meaning: TarotLocaleText;
  keywords: { en: string[]; mn: string[] };
  description: TarotLocaleText;
  upright: TarotLocaleText;
  reversed: TarotLocaleText;
}

/**
 * Card metadata (description, keywords, core_meaning, image, orientation meaning) is sourced
 * *live* from tarot_cards.json, keyed by English card name, rather than from the persisted D1
 * snapshot. This way edits to tarot_cards.json — and fields added after a row was written, like
 * `description` — surface immediately without regenerating cached rows. The stored payload only
 * supplies the daily card identity (name) + orientation + the generated reading text.
 *
 * Falls back to the persisted snapshot for any card whose name is not found in tarot_cards.json
 * (e.g. a legacy row whose title predates the current deck), so the API never regresses.
 */
const SOURCE_CARDS = new Map<string, SourceCard>(
  (tarotCardsJson as SourceCard[]).map((c) => [c.name.en.trim().toLowerCase(), c]),
);

export function flattenTarotPayload(
  payload: TarotPersistedPayload,
  lang: Lang,
  energyScore: number,
): TarotApiResponse {
  const cod = payload.card_of_the_day;
  const orientation = cod.orientation;
  const src = SOURCE_CARDS.get(cod.name.en.trim().toLowerCase());

  // Prefer the live tarot_cards.json values; fall back to the persisted snapshot when the card
  // is not in the current deck, and finally to core_meaning so legacy rows stay non-breaking.
  const description = src
    ? pickLang(src.description, lang)
    : cod.description
      ? pickLang(cod.description, lang)
      : pickLang(cod.core_meaning, lang);

  const meaningBlock = src ? (orientation === 'Upright' ? src.upright : src.reversed) : cod.meaning;
  const meaning = meaningBlock ? pickLang(meaningBlock, lang) : pickLang(cod.core_meaning, lang);

  const coreMeaning = pickLang(src ? src.core_meaning : cod.core_meaning, lang);
  const keywords = pickLangList(src ? src.keywords : cod.keywords, lang);
  const image = (src ? src.image : cod.image) ?? '';
  const name = pickLang(src ? src.name : cod.name, lang);

  return {
    date: payload.date,
    timezone: payload.timezone,
    sign: payload.sign,
    energyScore,
    card_of_the_day: {
      name,
      arcana: src ? src.arcana : cod.arcana,
      orientation,
      image: image.trim(),
      core_meaning: coreMeaning,
      keywords,
      description,
      meaning,
    },
    reading: {
      overview: pickLang(payload.reading.overview, lang),
      love: pickLang(payload.reading.love, lang),
      career: pickLang(payload.reading.career, lang),
      energy: pickLang(payload.reading.energy, lang),
    },
  };
}
