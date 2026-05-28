import { describe, expect, it } from 'vitest';
import {
  compatibilityAnalyticsContext,
  compatibilityPairKey,
  compatibilityScoreBand,
} from '@astralis/lib/compatibilityAnalytics';

describe('compatibilityAnalytics (shared)', () => {
  it('builds stable pair keys and score bands', () => {
    expect(compatibilityPairKey('leo', 'aquarius')).toBe('aquarius_leo');
    expect(compatibilityScoreBand(78)).toBe('70_84');
  });

  it('normalizes locale and utm on landing context', () => {
    const ctx = compatibilityAnalyticsContext({
      locale: 'en',
      sign1: 'leo',
      sign2: 'aquarius',
      sharedScore: 90,
      query: { utm_source: 'compatibility_share', utm_medium: 'share_card' },
    });
    expect(ctx.locale).toBe('en');
    expect(ctx.score_band).toBe('85_plus');
  });

  it('includes share_ref when provided explicitly', () => {
    const ref = 'shr_0123456789abcdef0123456789abcdef';
    const ctx = compatibilityAnalyticsContext({
      locale: 'en',
      sign1: 'leo',
      sign2: 'aquarius',
      sharedScore: 70,
      shareRef: ref,
    });
    expect(ctx.share_ref).toBe(ref);
  });
});
