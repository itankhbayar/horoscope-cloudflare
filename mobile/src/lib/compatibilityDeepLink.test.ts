import { describe, expect, it } from 'vitest';
import { parseCompatibilityDeepLink } from '@astralis/lib/compatibilityLanding';

describe('compatibilityDeepLink parsing', () => {
  it('supports app scheme URLs', () => {
    expect(parseCompatibilityDeepLink('astralis://compatibility/leo/aquarius?score=78')).toEqual({
      sign1: 'leo',
      sign2: 'aquarius',
      score: 78,
    });
  });
});
