import { describe, expect, it } from 'vitest';
import type { DailyHoroscope } from '@astralis/lib/types';
import {
  currentSkySummary,
  moonFromHoroscope,
  strongestTransitCopy,
  transitFromHoroscope,
  whyThisReadingCopy,
} from './homeContentUtils';

const baseHoroscope: DailyHoroscope = {
  sign: 'gemini',
  date: '2026-05-20',
  overall: 'Overall reading.',
  love: 'Love reading.',
  career: 'Career reading.',
  health: 'Health reading.',
  luckyNumber: 7,
  luckyColor: 'Sapphire',
};

describe('home sky context helpers', () => {
  it('formats visible current sky data from the shared horoscope type', () => {
    const h: DailyHoroscope = {
      ...baseHoroscope,
      skyContext: {
        sunSign: 'taurus',
        moonSign: 'cancer',
        moonPhase: 'Waxing Crescent',
      },
    };

    expect(currentSkySummary(h)).toEqual([
      { label: 'Sun', value: 'Taurus' },
      { label: 'Moon', value: 'Cancer' },
      { label: 'Phase', value: 'Waxing Crescent' },
    ]);
    expect(moonFromHoroscope(h, 'pisces').title).toBe('Moon in Cancer');
  });

  it('describes the strongest transit when one is available', () => {
    const h: DailyHoroscope = {
      ...baseHoroscope,
      skyContext: {
        sunSign: 'taurus',
        moonSign: 'cancer',
        moonPhase: 'Waxing Crescent',
        focusTransit: {
          transitBody: 'Pluto',
          natalBody: 'Mercury',
          aspect: 'trine',
          orb: 0.17,
          natalHouse: 8,
          transitSign: 'aquarius',
          natalSign: 'gemini',
        },
      },
    };

    expect(strongestTransitCopy(h)).toBe('Pluto trine your natal Mercury in your 8th house at a 0.2 degree orb.');
    expect(transitFromHoroscope(h).body).toContain('Pluto trine your natal Mercury');
    expect(whyThisReadingCopy(h)).toContain('Sun in Taurus, Moon in Cancer');
  });

  it('uses a calm fallback when no strongest transit is present', () => {
    const h: DailyHoroscope = {
      ...baseHoroscope,
      skyContext: {
        sunSign: 'taurus',
        moonSign: 'cancer',
        moonPhase: 'Waxing Crescent',
      },
    };

    expect(strongestTransitCopy(h)).toBe(
      'No exact major transit is peaking today, so today\'s reading leans on the current Moon phase and your natal chart.',
    );
    expect(whyThisReadingCopy(h)).toContain('leans on the current Moon phase');
  });
});
