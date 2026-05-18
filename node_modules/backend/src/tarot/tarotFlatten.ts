import type { Lang } from '../utils/lang';
import type { TarotApiResponse, TarotPersistedPayload } from './tarotTypes';

function pickLang<T extends { en: string; mn: string }>(block: T, lang: Lang): string {
  return lang === 'mn' ? block.mn : block.en;
}

export function flattenTarotPayload(
  payload: TarotPersistedPayload,
  lang: Lang,
  energyScore: number,
): TarotApiResponse {
  return {
    date: payload.date,
    timezone: payload.timezone,
    sign: payload.sign,
    energyScore,
    card_of_the_day: {
      name: pickLang(payload.card_of_the_day.name, lang),
      arcana: payload.card_of_the_day.arcana,
      orientation: payload.card_of_the_day.orientation,
      core_meaning: pickLang(payload.card_of_the_day.core_meaning, lang),
    },
    reading: {
      overview: pickLang(payload.reading.overview, lang),
      love: pickLang(payload.reading.love, lang),
      career: pickLang(payload.reading.career, lang),
      energy: pickLang(payload.reading.energy, lang),
    },
  };
}
