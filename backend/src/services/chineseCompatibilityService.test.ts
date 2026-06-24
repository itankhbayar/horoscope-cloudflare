import { describe, it, expect } from 'vitest';
import { computeChineseCompatibility } from './chineseCompatibilityService';

describe('computeChineseCompatibility', () => {
  it('scores a clash pair (Rat + Horse) low', () => {
    const r = computeChineseCompatibility('rat', 'horse', 'en');
    expect(r.overallScore).toBeLessThan(60);
  });

  it('scores a trine pair (Rat + Dragon) high', () => {
    const r = computeChineseCompatibility('rat', 'dragon', 'en');
    expect(r.overallScore).toBeGreaterThanOrEqual(75);
  });

  it('scores a secret-friend pair (Rat + Ox) high', () => {
    const r = computeChineseCompatibility('rat', 'ox', 'en');
    expect(r.overallScore).toBeGreaterThanOrEqual(75);
  });

  it('returns localized Mongolian copy', () => {
    const r = computeChineseCompatibility('rat', 'dragon', 'mn');
    expect(r.summary.length).toBeGreaterThan(0);
    // Mongolian copy uses Cyrillic.
    expect(/[Ѐ-ӿ]/.test(r.summary)).toBe(true);
  });

  it('always returns scores within 0–100', () => {
    const r = computeChineseCompatibility('tiger', 'monkey', 'en');
    for (const s of [r.overallScore, r.loveScore, r.friendshipScore, r.communicationScore]) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});
