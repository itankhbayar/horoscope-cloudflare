import { describe, expect, it } from 'vitest';
import { TAROT_COPY_REV } from './tarotCopyRev';
import { tarotPayloadNeedsBilingualRefresh } from './tarotPayloadQuality';
import type { TarotPersistedPayload } from './tarotTypes';

function base(): TarotPersistedPayload {
  const mk = (en: string, mn: string) => ({ en, mn });
  return {
    copyRev: TAROT_COPY_REV,
    date: '2026-05-01',
    timezone: 'Asia/Ulaanbaatar',
    sign: 'taurus',
    card_of_the_day: {
      name: mk('Six of Pentacles', 'Зургаан зоос'),
      arcana: 'Minor',
      orientation: 'Upright',
      core_meaning: mk('Give and receive.', 'Өгөж, хүлээн авах.'),
    },
    reading: {
      overview: mk('English overview long enough.', 'Өнөөдөр энэ бол Монгол хэсэг.'),
      love: mk('Love en.', 'Хайрын монгол.'),
      career: mk('Career en.', 'Карьерын монгол.'),
      energy: mk('Energy en.', 'Энергийн монгол.'),
    },
  };
}

describe('tarotPayloadNeedsBilingualRefresh', () => {
  it('returns true when copyRev is missing or stale', () => {
    const p = base();
    delete p.copyRev;
    expect(tarotPayloadNeedsBilingualRefresh(p)).toBe(true);
    p.copyRev = 1;
    expect(tarotPayloadNeedsBilingualRefresh(p)).toBe(true);
  });

  it('returns true when overview mn matches legacy template markers', () => {
    const p = base();
    p.reading.overview.mn =
      '2026-05-01 өдөр Asia/Ulaanbaatar бүсэд taurus-д Цамхаг Эргүү-ээр гарвал өдрийг бүтээлч эрсдэл сэдлээр тойрч харна.';
    expect(tarotPayloadNeedsBilingualRefresh(p)).toBe(true);
  });

  it('returns false for proper distinct mn', () => {
    expect(tarotPayloadNeedsBilingualRefresh(base())).toBe(false);
  });

  it('returns true when mn duplicates en', () => {
    const p = base();
    p.reading.overview = { en: 'Same text.', mn: 'Same text.' };
    expect(tarotPayloadNeedsBilingualRefresh(p)).toBe(true);
  });

  it('returns true when overview and energy mn are identical long glue', () => {
    const p = base();
    const glue =
      'Quietly today, the Six of Pentacles is on your side today. Taurus, give and receive in fair, dignified flow.';
    p.reading.overview = { en: glue, mn: glue };
    p.reading.energy = { en: glue, mn: glue };
    p.reading.love = { en: 'Short.', mn: 'Богино.' };
    p.reading.career = { en: 'Short.', mn: 'Богино.' };
    expect(tarotPayloadNeedsBilingualRefresh(p)).toBe(true);
  });

  it('returns true when all reading mn bodies are Latin-only and long', () => {
    const p = base();
    const lat =
      'Choose the ritual that comforts without numbing. More words here to pass length threshold easily done now.';
    p.reading.overview = { en: lat, mn: lat };
    p.reading.love = { en: lat, mn: lat };
    p.reading.career = { en: lat, mn: lat };
    p.reading.energy = { en: lat, mn: lat };
    expect(tarotPayloadNeedsBilingualRefresh(p)).toBe(true);
  });

  it('returns true when mn differs from en but is still Latin-only prose (AI-style)', () => {
    const p = base();
    p.reading.overview = {
      en: 'Capricorn, the reversed Four of Cups asks for honest pause today.',
      mn: 'Capricorn, boredom hiding what you actually want.',
    };
    p.reading.energy = { en: 'Energy en.', mn: 'Capricorn, boredom hiding what you actually want.' };
    expect(tarotPayloadNeedsBilingualRefresh(p)).toBe(true);
  });
});
