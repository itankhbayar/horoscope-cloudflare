/**
 * Canonical JSON stored in `tarot_daily.payload_json`.
 * Bilingual fields are `{ en, mn }` for future UI/API `lang` without schema migration.
 * Keep aligned with `frontend/src/lib/types.ts`.
 */
export type TarotLocaleText = { en: string; mn: string };

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
