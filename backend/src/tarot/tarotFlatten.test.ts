import { describe, expect, it } from 'vitest';
import { flattenTarotPayload } from './tarotFlatten';
import type { TarotPersistedPayload } from './tarotTypes';
import tarotCardsJson from '../../data/tarot_cards.json';

interface SourceCard {
  arcana: 'Major' | 'Minor';
  name: { en: string; mn: string };
  core_meaning: { en: string; mn: string };
  description: { en: string; mn: string };
  upright: { en: string; mn: string };
  reversed: { en: string; mn: string };
}
const cards = tarotCardsJson as SourceCard[];

function basePayload(over: Partial<TarotPersistedPayload['card_of_the_day']>): TarotPersistedPayload {
  return {
    copyRev: 3,
    date: '2026-06-18',
    timezone: 'UTC',
    sign: 'virgo',
    card_of_the_day: {
      name: { en: 'X', mn: 'X' },
      arcana: 'Minor',
      orientation: 'Upright',
      core_meaning: { en: 'core en', mn: 'core mn' },
      ...over,
    },
    reading: {
      overview: { en: 'o', mn: 'о' },
      love: { en: 'l', mn: 'л' },
      career: { en: 'c', mn: 'к' },
      energy: { en: 'e', mn: 'э' },
    },
  };
}

describe('flattenTarotPayload sources card metadata from tarot_cards.json', () => {
  it('serves the live description even when the stored snapshot lacks one (stale row)', () => {
    const card = cards[0]!; // a real deck card
    const payload = basePayload({
      name: { en: card.name.en, mn: card.name.mn },
      // No `description`/`meaning`/`keywords` — simulates a pre-rev-4 stored row.
    });

    const en = flattenTarotPayload(payload, 'en', 50);
    const mn = flattenTarotPayload(payload, 'mn', 50);

    expect(en.card_of_the_day.description).toBe(card.description.en);
    expect(mn.card_of_the_day.description).toBe(card.description.mn);
    expect(en.card_of_the_day.description).not.toBe(en.card_of_the_day.core_meaning);
    // Orientation meaning also comes live from the deck.
    expect(en.card_of_the_day.meaning).toBe(card.upright.en);
  });

  it('uses reversed meaning for reversed orientation', () => {
    const card = cards[0]!;
    const payload = basePayload({ name: { en: card.name.en, mn: card.name.mn }, orientation: 'Reversed' });
    expect(flattenTarotPayload(payload, 'en', 50).card_of_the_day.meaning).toBe(card.reversed.en);
  });

  it('falls back to the stored snapshot for a card not in the current deck', () => {
    const payload = basePayload({
      name: { en: 'Not A Real Card', mn: 'Not A Real Card' },
      description: { en: 'snapshot desc', mn: 'снапшот' },
    });
    expect(flattenTarotPayload(payload, 'en', 50).card_of_the_day.description).toBe('snapshot desc');
  });

  it('falls back to core_meaning when neither deck nor snapshot has a description', () => {
    const payload = basePayload({ name: { en: 'Not A Real Card', mn: 'Not A Real Card' } });
    const en = flattenTarotPayload(payload, 'en', 50);
    expect(en.card_of_the_day.description).toBe('core en');
  });
});
