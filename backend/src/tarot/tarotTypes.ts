/**
 * Canonical JSON stored in `tarot_daily.payload_json`.
 * Bilingual fields are `{ en, mn }` for future UI/API `lang` without schema migration.
 * Keep aligned with `frontend/src/lib/types.ts`.
 */
export type TarotLocaleText = { en: string; mn: string };
/** Bilingual list (e.g. keyword tags). Each locale is its own array. */
export type TarotLocaleList = { en: string[]; mn: string[] };

export interface TarotPersistedPayload {
  /** Present on newly generated rows; missing or stale → cache refresh. */
  copyRev?: number;
  date: string;
  timezone: string;
  sign: string;
  card_of_the_day: {
    /** Rider–Waite style title in both locales (API returns one via `lang`). */
    name: TarotLocaleText;
    arcana: 'Major' | 'Minor';
    orientation: 'Upright' | 'Reversed';
    core_meaning: TarotLocaleText;
    /** Card art URL (from tarot_cards.json). Single value, not localized. Optional for legacy rows. */
    image?: string;
    /**
     * Richer card data (added in copyRev 4). Optional so pre-rev-4 rows still
     * validate and read; the GET/prewarm refresh regenerates them with these set.
     */
    keywords?: TarotLocaleList;
    description?: TarotLocaleText;
    /** Orientation-specific meaning chosen at generation time (upright vs reversed). */
    meaning?: TarotLocaleText;
  };
  reading: {
    overview: TarotLocaleText;
    love: TarotLocaleText;
    career: TarotLocaleText;
    energy: TarotLocaleText;
  };
}

/** Flattened API shape (single language slice). */
export interface TarotPublicCard {
  name: string;
  arcana: 'Major' | 'Minor';
  orientation: 'Upright' | 'Reversed';
  core_meaning: string;
  /** Card art URL (empty string for legacy rows without one). */
  image: string;
  /** Short keyword tags for the drawn card. */
  keywords: string[];
  /** One-line imagery/essence of the card. */
  description: string;
  /** Orientation-aware meaning (upright vs reversed). Falls back to core_meaning for legacy rows. */
  meaning: string;
}

export interface TarotPublicReading {
  overview: string;
  love: string;
  career: string;
  energy: string;
}

export interface TarotApiResponse {
  date: string;
  timezone: string;
  sign: string;
  energyScore: number;
  card_of_the_day: TarotPublicCard;
  reading: TarotPublicReading;
}

/** Phase-2: swap implementation while keeping `generateTarotReading` signature stable. */
export type TarotGeneratorResult = {
  payload: TarotPersistedPayload;
  energyScore: number;
};
