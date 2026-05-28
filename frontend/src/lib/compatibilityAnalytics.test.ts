import { describe, expect, it } from 'vitest';
import {
  compatibilityAnalyticsContext,
  compatibilityPairKey,
  compatibilityScoreBand,
} from './compatibilityAnalytics';

describe('compatibilityAnalytics', () => {
  it('builds stable pair keys and score bands', () => {
    expect(compatibilityPairKey('leo', 'aquarius')).toBe('aquarius_leo');
    expect(compatibilityScoreBand(78)).toBe('70_84');
    expect(compatibilityScoreBand(44)).toBe('below_55');
  });

  it('extracts utm and locale for landing context', () => {
    const ctx = compatibilityAnalyticsContext({
      locale: 'mn-MN',
      sign1: 'leo',
      sign2: 'aquarius',
      sharedScore: 78,
      query: {
        utm_source: 'compatibility_share',
        utm_medium: 'share_card',
        utm_campaign: 'compatibility',
      },
    });
    expect(ctx.locale).toBe('mn');
    expect(ctx.utm_source).toBe('compatibility_share');
    expect(ctx.pair_key).toBe('aquarius_leo');
    expect(ctx.score_band).toBe('70_84');
  });
});
