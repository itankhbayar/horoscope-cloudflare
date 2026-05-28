import { describe, expect, it } from 'vitest';
import {
  compatibilityLandingWebUrl,
  guestCompareTarget,
  parseCompatibilityDeepLink,
  parseCompatibilityScoreParam,
} from './compatibilityLanding';

describe('compatibilityLanding helpers', () => {
  it('parses score query values', () => {
    expect(parseCompatibilityScoreParam('78')).toBe(78);
    expect(parseCompatibilityScoreParam('101')).toBeNull();
    expect(parseCompatibilityScoreParam(undefined)).toBeNull();
  });

  it('picks compare target for guest sign', () => {
    expect(guestCompareTarget('gemini', 'leo', 'aquarius')).toBe('aquarius');
    expect(guestCompareTarget('leo', 'leo', 'aquarius')).toBe('aquarius');
    expect(guestCompareTarget('aquarius', 'leo', 'aquarius')).toBe('leo');
  });

  it('parses compatibility deep links', () => {
    expect(
      parseCompatibilityDeepLink('https://astralis.app/compatibility/leo/aquarius?score=78&utm_source=compatibility_share'),
    ).toEqual({
      sign1: 'leo',
      sign2: 'aquarius',
      score: 78,
    });
    expect(parseCompatibilityDeepLink('astralis://compatibility/leo/aquarius')).toEqual({
      sign1: 'leo',
      sign2: 'aquarius',
      score: null,
    });
    expect(parseCompatibilityDeepLink('https://astralis.app/today')).toBeNull();
  });

  it('includes share_ref in landing web URLs when provided', () => {
    const url = compatibilityLandingWebUrl(
      'https://astralis.app',
      'leo',
      'aquarius',
      78,
      'shr_0123456789abcdef0123456789abcdef',
    );
    expect(url).toContain('share_ref=shr_0123456789abcdef0123456789abcdef');
  });
});
