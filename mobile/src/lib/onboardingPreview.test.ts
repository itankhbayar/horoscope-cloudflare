import { describe, expect, it } from 'vitest';
import { buildOnboardingPreview } from '@astralis/lib/onboardingPreview';
import type { PersonalSkyLayer } from '@astralis/lib/types';

const layer: PersonalSkyLayer = {
  date: '2026-05-27',
  sign: 'taurus',
  personalization: 'birth_date',
  resonanceScore: 50,
  headline: 'Taurus resonance for tonight',
  howTonightAffectsYou: 'Taurus energy is supported by direct language tonight.',
  emotionalWeather: 'The strongest personal overlay is clarity.',
  relationshipAtmosphere: 'Conversation may feel easier.',
  reflectionPrompt: 'What did your body understand first?',
  dreamSleepTone: 'Quiet but responsive.',
  quietHourSuggestion: 'Lower the inputs.',
  premiumBridge: 'Deeper personal timing opens with more chart detail.',
  ritualCards: [
    {
      id: 'tonight-window',
      title: "Tonight's window",
      body: 'Taurus energy is supported by direct language tonight.',
      signal: 'clarity',
    },
    {
      id: 'emotional-weather',
      title: 'Emotional weather',
      body: 'The strongest personal overlay is clarity.',
      signal: 'clarity',
    },
  ],
  sky: {
    date: '2026-05-27',
    moonSign: 'libra',
    moonPhase: 'Waxing Gibbous',
    atmosphere: {
      tension: 60,
      intimacy: 55,
      clarity: 78,
      momentum: 62,
      uncertainty: 55,
      reflection: 54,
      socialOpenness: 69,
      emotionalVolatility: 52,
    },
    majorAspects: [
      { body1: 'Moon', body2: 'Jupiter', type: 'square', orb: 0.23 },
    ],
  },
};

describe('buildOnboardingPreview', () => {
  it('builds a grounded English preview from zodiac and current sky data', () => {
    const preview = buildOnboardingPreview(layer, {
      hasBirthTime: false,
      cityName: 'Ulaanbaatar',
      locale: 'en',
    });

    expect(preview.identityTitle).toBe('Your Sun is in Taurus.');
    expect(preview.identityBody).toContain('steady, practical');
    expect(preview.todayTheme).toBe("Today's dominant theme: clearer language.");
    expect(preview.transitTitle).toBe('Moon square Jupiter');
    expect(preview.transitBody).toContain('Ulaanbaatar anchors the sky');
    expect(preview.missingItems).toEqual(['Rising sign', 'House placements', 'More precise timing']);
  });

  it('uses Mongolian copy without implying missing birth time is a failure', () => {
    const preview = buildOnboardingPreview(layer, {
      hasBirthTime: false,
      cityName: 'Ulaanbaatar',
      locale: 'mn',
    });

    expect(preview.identityTitle).toContain('Taurus');
    expect(preview.missingBody).toContain('шийтгэл биш');
    expect(preview.futureTitle).toContain('өнөөдрөөс');
  });
});
