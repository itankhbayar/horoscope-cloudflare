import { describe, expect, it } from 'vitest';
import type { NatalChart } from '@astralis/lib/types';
import { buildNatalRevealCards, skyMappingStep, whyBirthplaceMatters } from './onboardingReveal';

const chart: NatalChart = {
  id: 'chart-1',
  userId: 'user-1',
  sunSign: 'gemini',
  moonSign: 'pisces',
  risingSign: 'libra',
  planets: [],
  houses: [],
  aspects: [],
  computedAt: '2026-05-20T00:00:00Z',
  sunInfo: {
    key: 'gemini',
    name: 'Gemini',
    symbol: 'Gemini',
    element: 'air',
    modality: 'mutable',
    rulingPlanet: 'Mercury',
    startMonth: 5,
    startDay: 21,
  },
  moonInfo: {
    key: 'pisces',
    name: 'Pisces',
    symbol: 'Pisces',
    element: 'water',
    modality: 'mutable',
    rulingPlanet: 'Jupiter',
    startMonth: 2,
    startDay: 19,
  },
  risingInfo: {
    key: 'libra',
    name: 'Libra',
    symbol: 'Libra',
    element: 'air',
    modality: 'cardinal',
    rulingPlanet: 'Venus',
    startMonth: 9,
    startDay: 23,
  },
};

describe('onboarding reveal helpers', () => {
  it('cycles calm sky-mapping loading copy', () => {
    expect(skyMappingStep(0)).toBe('Mapping the sky above your birthplace...');
    expect(skyMappingStep(3)).toBe('Reading your first chart pattern...');
    expect(skyMappingStep(4)).toBe('Mapping the sky above your birthplace...');
  });

  it('builds reveal cards only from available natal fields', () => {
    expect(buildNatalRevealCards(chart)).toEqual([
      expect.objectContaining({ label: 'Sun', title: 'Gemini' }),
      expect.objectContaining({ label: 'Moon', title: 'Pisces' }),
      expect.objectContaining({ label: 'Rising', title: 'Libra' }),
    ]);

    const withoutRising = { ...chart, risingSign: null, risingInfo: null };
    expect(buildNatalRevealCards(withoutRising)[2]).toMatchObject({
      label: 'Rising',
      title: 'Birth time needed',
    });
  });

  it('explains birthplace without inventing unsupported placements', () => {
    expect(whyBirthplaceMatters('Ulaanbaatar')).toContain('Ulaanbaatar anchors the horizon line');
    expect(whyBirthplaceMatters()).toContain('Your city anchors the horizon line');
  });
});
