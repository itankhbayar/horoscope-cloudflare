import { describe, expect, it } from 'vitest';
import { buildPersonalSkyLayer } from './personalSkyService';

describe('buildPersonalSkyLayer', () => {
  it('builds deterministic lightweight resonance from zodiac sign without account data', () => {
    const a = buildPersonalSkyLayer({ sign: 'scorpio' }, '2026-05-25');
    const b = buildPersonalSkyLayer({ sign: 'scorpio' }, '2026-05-25');

    expect(a).toEqual(b);
    expect(a.sign).toBe('scorpio');
    expect(a.personalization).toBe('zodiac_sign');
    expect(a.ritualCards.map((card) => card.id)).toEqual([
      'tonight-window',
      'emotional-weather',
      'relationship-atmosphere',
      'reflection-prompt',
      'dream-sleep-tone',
    ]);
  });

  it('derives sign from birth date without requiring city or birth time', () => {
    const layer = buildPersonalSkyLayer({ birthDate: '1990-01-05' }, '2026-05-25');

    expect(layer.sign).toBe('capricorn');
    expect(layer.personalization).toBe('birth_date');
    expect(layer.howTonightAffectsYou).toContain('Capricorn');
  });

  it('avoids deterministic, medical, financial, or fatalistic claims', () => {
    const layer = buildPersonalSkyLayer({ sign: 'gemini' }, '2026-05-25');
    const copy = [
      layer.headline,
      layer.howTonightAffectsYou,
      layer.relationshipAtmosphere,
      layer.reflectionPrompt,
      layer.dreamSleepTone,
      layer.quietHourSuggestion,
      ...layer.ritualCards.map((card) => card.body),
    ].join(' ');

    expect(copy).not.toMatch(/will happen|destined|diagnos|invest|buy|sell|emergency|guaranteed/i);
  });
});
