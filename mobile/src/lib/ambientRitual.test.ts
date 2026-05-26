import { describe, expect, it } from 'vitest';
import { ambientFatigueRisk, buildAmbientRitualState, buildAmbientRitualTheme } from './ambientRitual';
import type { GlobalSkyToday } from '@astralis/lib/types';

const sky: GlobalSkyToday = {
  date: '2026-05-25',
  moonSign: 'scorpio',
  moonPhase: 'Waning Gibbous',
  headline: 'The Moon in Scorpio makes the emotional subtext harder to ignore.',
  summary: 'A quiet night for noticing what tone has been carrying.',
  shareLine: 'The sky is reflective tonight.',
  atmosphere: {
    tension: 48,
    intimacy: 56,
    clarity: 42,
    momentum: 30,
    uncertainty: 38,
    reflection: 74,
    socialOpenness: 26,
    emotionalVolatility: 51,
  },
  cards: [],
  majorAspects: [],
  mercuryActivity: 'Mercury is steady.',
  venusMarsTension: null,
  retrogradeBodies: [],
  eclipseWindow: { active: false, note: 'No eclipse window.' },
};

describe('ambient ritual engine', () => {
  it('derives a calm theme from sky atmosphere and moon phase', () => {
    const theme = buildAmbientRitualTheme(sky);

    expect(theme.key).toBe('moonlit-stillness');
    expect(theme.transitionMs).toBeGreaterThan(0);
    expect(theme.particleOpacity).toBeLessThanOrEqual(0.14);
  });

  it('honors reduced motion by disabling motion-heavy tokens', () => {
    const theme = buildAmbientRitualTheme(sky, { reducedMotion: true });

    expect(theme.transitionMs).toBe(0);
    expect(theme.shimmerMs).toBe(0);
    expect(theme.particleOpacity).toBe(0);
    expect(theme.hapticMs).toBe(0);
  });

  it('keeps calm reading concise', () => {
    const state = buildAmbientRitualState(sky);

    expect(state.singleLine.length).toBeLessThanOrEqual(136);
    expect(ambientFatigueRisk([state.singleLine])).toBe('low');
  });
});
