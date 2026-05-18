import { describe, expect, it } from 'vitest';
import { computeNatalChart, type BirthInput } from './astrologyService';

/**
 * Fixed birth input for regression snapshots (astronomy-engine).
 * Ulaanbaatar — 1990-06-15 14:30 local (UTC+8).
 */
export const SNAPSHOT_BIRTH_INPUT: BirthInput = {
  birthDate: '1990-06-15',
  birthTime: '14:30',
  latitude: 47.9212,
  longitude: 106.9186,
  timezoneOffset: 8,
};

describe('computeNatalChart', () => {
  it('matches snapshot for canonical birth input', () => {
    const chart = computeNatalChart(SNAPSHOT_BIRTH_INPUT);

    expect({
      birth: SNAPSHOT_BIRTH_INPUT,
      sunSign: chart.sunSign,
      moonSign: chart.moonSign,
      risingSign: chart.risingSign,
      ascendant: chart.ascendant,
      midheaven: chart.midheaven,
      planets: chart.planets.map((p) => ({
        name: p.name,
        sign: p.sign,
        degreeInSign: p.degreeInSign,
        retrograde: p.retrograde,
        house: p.house,
      })),
      houseSigns: chart.houses.map((h) => ({ number: h.number, sign: h.sign })),
      aspectSummary: chart.aspects.map((a) => ({
        body1: a.body1,
        body2: a.body2,
        type: a.type,
        orb: a.orb,
      })),
    }).toMatchSnapshot();
  });

  it('exposes sun, moon, and rising signs for timed births', () => {
    const chart = computeNatalChart(SNAPSHOT_BIRTH_INPUT);

    expect(chart.sunSign).toBe('gemini');
    expect(chart.moonSign).toBe('pisces');
    expect(chart.risingSign).toBe('libra');
    expect(chart.houses).toHaveLength(12);
    expect(chart.planets).toHaveLength(10);
  });

  it('omits houses and rising sign when birth time is missing', () => {
    const chart = computeNatalChart({
      ...SNAPSHOT_BIRTH_INPUT,
      birthTime: null,
    });

    expect(chart.risingSign).toBeNull();
    expect(chart.houses).toHaveLength(0);
    expect(chart.sunSign).toBe('gemini');
    expect(chart.moonSign).toBe('pisces');
  });
});
