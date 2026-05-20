import { describe, expect, it } from 'vitest';
import { computeSignCompatibility } from './compatibilityService';
import type { ZodiacSign } from '../utils/zodiac';

function scoresFor(sign1: ZodiacSign, sign2: ZodiacSign) {
  const result = computeSignCompatibility(sign1, sign2, 'en');
  return {
    overallScore: result.overallScore,
    loveScore: result.loveScore,
    friendshipScore: result.friendshipScore,
    communicationScore: result.communicationScore,
  };
}

describe('computeSignCompatibility', () => {
  it.each([
    [
      'same sign pair',
      'aries',
      'aries',
      { overallScore: 77, loveScore: 81, friendshipScore: 79, communicationScore: 70 },
    ],
    [
      'traditionally compatible fire pair',
      'aries',
      'leo',
      { overallScore: 81, loveScore: 82, friendshipScore: 81, communicationScore: 79 },
    ],
    [
      'traditionally compatible earth/water pair',
      'taurus',
      'cancer',
      { overallScore: 83, loveScore: 85, friendshipScore: 83, communicationScore: 81 },
    ],
    [
      'traditionally difficult fire/water fixed pair',
      'scorpio',
      'leo',
      { overallScore: 57, loveScore: 55, friendshipScore: 57, communicationScore: 59 },
    ],
  ] as const)('generates known scores for %s', (_label, sign1, sign2, expected) => {
    expect(scoresFor(sign1, sign2)).toEqual(expected);
  });

  it('returns stable deterministic results for the same pair', () => {
    const first = computeSignCompatibility('aries', 'leo', 'en');
    const second = computeSignCompatibility('aries', 'leo', 'en');

    expect(second).toEqual(first);
  });

  it('scores reversed pairs symmetrically while preserving requested order', () => {
    const forward = computeSignCompatibility('aries', 'taurus', 'en');
    const reversed = computeSignCompatibility('taurus', 'aries', 'en');

    expect(scoresFor('taurus', 'aries')).toEqual(scoresFor('aries', 'taurus'));
    expect(forward.sign1).toBe('aries');
    expect(forward.sign2).toBe('taurus');
    expect(reversed.sign1).toBe('taurus');
    expect(reversed.sign2).toBe('aries');
  });

  it('throws for unknown signs when called without route-level validation', () => {
    expect(() =>
      computeSignCompatibility('ophiuchus' as unknown as ZodiacSign, 'aries', 'en'),
    ).toThrow();
  });
});
