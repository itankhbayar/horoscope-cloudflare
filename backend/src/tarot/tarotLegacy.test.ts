import { describe, expect, it } from 'vitest';
import { legacyPayloadToPersisted, looseFlatTarotToPersisted } from './tarotLegacy';
import { validateTarotPayload } from './tarotValidator';

describe('legacyPayloadToPersisted', () => {
  it('converts v1 card/sections/meta rows into the new schema', () => {
    const legacy = {
      card: {
        name: 'The Star',
        arcana: 'major',
        orientation: 'upright',
        coreMeaning: 'Hope after difficulty.',
      },
      sections: {
        overview: 'Overview line.',
        love: 'Love line.',
        career: 'Career line.',
        innerGrowth: 'Growth.',
        timingAdvice: 'Timing.',
        caution: 'Caution.',
        affirmation: 'I am calm.',
      },
      meta: { mood: 'Reflective', keywords: ['a', 'b', 'c'] },
    };
    const migrated = legacyPayloadToPersisted(legacy, 'leo', '2026-05-01', 'UTC');
    expect(migrated).not.toBeNull();
    const v = validateTarotPayload(migrated!);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.value.card_of_the_day.arcana).toBe('Major');
      expect(v.value.reading.overview.en).toBe('Overview line.');
    }
  });
});

describe('looseFlatTarotToPersisted', () => {
  it('accepts flat-string example shape', () => {
    const raw = {
      date: '2026-05-01',
      timezone: 'Asia/Ulaanbaatar',
      sign: 'aries',
      card_of_the_day: {
        name: 'The Star',
        arcana: 'Major',
        orientation: 'Upright',
        core_meaning: 'Hope, healing, renewal',
      },
      reading: {
        overview: 'A',
        love: 'B',
        career: 'C',
        energy: 'D',
      },
    };
    const p = looseFlatTarotToPersisted(raw, 'aries', '2026-05-01', 'Asia/Ulaanbaatar');
    expect(p).not.toBeNull();
    expect(validateTarotPayload(p!).ok).toBe(true);
  });

  it('accepts lowercase arcana in flat shape', () => {
    const raw = {
      card_of_the_day: {
        name: 'The Moon',
        arcana: 'major',
        orientation: 'reversed',
        core_meaning: 'x',
      },
      reading: { overview: 'a', love: 'b', career: 'c', energy: 'e' },
    };
    const p = looseFlatTarotToPersisted(raw, 'leo', '2026-06-01', 'UTC');
    expect(p).not.toBeNull();
    expect(validateTarotPayload(p!).ok).toBe(true);
  });
});
