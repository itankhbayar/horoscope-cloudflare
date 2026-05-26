import { describe, expect, it } from 'vitest';
import { compressRitualCopy, hasLegacyPremiumLanguage } from './ritualMomentCopy';

describe('ritual moment copy helpers', () => {
  it('compresses long copy into a quiet single line', () => {
    const source = 'This is a long atmospheric interpretation that should become shorter before it appears in a Home ritual moment because Home should not feel like a wall of prose.';

    expect(compressRitualCopy(source, 72).length).toBeLessThanOrEqual(72);
    expect(compressRitualCopy(source, 72)).toMatch(/\.\.\.$/);
  });

  it('flags old locked-module premium language', () => {
    expect(hasLegacyPremiumLanguage('Upgrade to unlock more content')).toBe(true);
    expect(hasLegacyPremiumLanguage('This is a locked feature')).toBe(true);
    expect(hasLegacyPremiumLanguage('Open the premium module')).toBe(true);
    expect(hasLegacyPremiumLanguage('Get access to more readings')).toBe(true);
    expect(hasLegacyPremiumLanguage('Do not lose your streak')).toBe(true);
    expect(hasLegacyPremiumLanguage('Hurry, something urgent is waiting')).toBe(true);
    expect(hasLegacyPremiumLanguage("Continue deeper into tonight's rhythm")).toBe(false);
    expect(hasLegacyPremiumLanguage('Open your private ritual archive')).toBe(false);
  });
});
