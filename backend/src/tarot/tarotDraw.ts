/**
 * Free-draw ("ask the cards") tarot: a single random card + orientation, reshuffled
 * on every call. Unlike the daily card it is never persisted — each request is fresh.
 */
import type { Lang } from '../utils/lang';
import type { TarotPublicCard } from './tarotTypes';
import tarotCardsJson from '../../data/tarot_cards.json';

interface Bilingual {
  en: string;
  mn: string;
}
interface BilingualList {
  en: string[];
  mn: string[];
}
interface CardEntry {
  arcana: 'Major' | 'Minor';
  image: string;
  name: Bilingual;
  core_meaning: Bilingual;
  keywords: BilingualList;
  description: Bilingual;
  upright: Bilingual;
  reversed: Bilingual;
}

const allCards = tarotCardsJson as CardEntry[];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Draw one random card in the requested language. Random card + random orientation. */
export function drawRandomCard(lang: Lang): TarotPublicCard {
  const card = pick(allCards);
  const upright = Math.random() < 0.5;
  const orientation: 'Upright' | 'Reversed' = upright ? 'Upright' : 'Reversed';
  const meaning = upright ? card.upright : card.reversed;

  const text = (b: Bilingual): string => (lang === 'mn' ? b.mn : b.en).trim();
  const list = (b: BilingualList): string[] => (lang === 'mn' ? b.mn : b.en).map((s) => s.trim());

  return {
    name: text(card.name),
    arcana: card.arcana,
    orientation,
    core_meaning: text(card.core_meaning),
    image: card.image.trim(),
    keywords: list(card.keywords),
    description: text(card.description),
    meaning: text(meaning),
  };
}
