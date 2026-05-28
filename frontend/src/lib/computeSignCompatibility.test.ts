import { describe, expect, it } from 'vitest';
import { computeSignCompatibility } from './computeSignCompatibility';
import type { ZodiacSign } from './types';

function scoresFor(sign1: ZodiacSign, sign2: ZodiacSign) {
  const result = computeSignCompatibility(sign1, sign2, 'en');
  return {
    overallScore: result.overallScore,
    loveScore: result.loveScore,
    friendshipScore: result.friendshipScore,
    communicationScore: result.communicationScore,
  };
}

describe('computeSignCompatibility (shared landing engine)', () => {
  it.each([
    ['aries', 'aries', { overallScore: 77, loveScore: 81, friendshipScore: 79, communicationScore: 70 }],
    ['aries', 'leo', { overallScore: 81, loveScore: 82, friendshipScore: 81, communicationScore: 79 }],
    ['taurus', 'cancer', { overallScore: 83, loveScore: 85, friendshipScore: 83, communicationScore: 81 }],
    ['scorpio', 'leo', { overallScore: 57, loveScore: 55, friendshipScore: 57, communicationScore: 59 }],
  ] as const)('matches backend scores for %s + %s', (sign1, sign2, expected) => {
    expect(scoresFor(sign1, sign2)).toEqual(expected);
  });

  it('returns stable deterministic results', () => {
    const first = computeSignCompatibility('aries', 'leo', 'en');
    const second = computeSignCompatibility('aries', 'leo', 'en');
    expect(second).toEqual(first);
  });
});
