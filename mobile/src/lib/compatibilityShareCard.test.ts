import { describe, expect, it } from 'vitest';
import { buildCompatibilityShareCard, buildCompatibilityShareUrl } from '@astralis/lib/compatibilityShareCard';
import { createCompatibilityShareRef } from '@astralis/lib/compatibilityShareRef';
import type { CompatibilityResult } from '@astralis/lib/types';

const baseResult: CompatibilityResult = {
  sign1: 'aries',
  sign2: 'leo',
  overallScore: 86,
  loveScore: 90,
  friendshipScore: 82,
  communicationScore: 78,
  summary: 'A warm, direct pairing.',
  highlights: ['Fast spark', 'Shared courage'],
};

describe('buildCompatibilityShareCard', () => {
  it('builds an English viral share card with UTM acquisition link', () => {
    const card = buildCompatibilityShareCard(baseResult, {
      locale: 'en',
      sign1Name: 'Aries',
      sign2Name: 'Leo',
      appUrl: 'https://example.com/',
    });

    expect(card.scoreLabel).toBe('86% match');
    expect(card.pairLabel).toBe('Aries + Leo');
    expect(card.themeTitle).toBe('Magnetic harmony');
    expect(card.metricLine).toContain('Love 90%');
    expect(card.shareUrl).toBe(
      'https://example.com/compatibility/aries/leo?utm_source=compatibility_share&utm_medium=share_card&utm_campaign=compatibility&score=86',
    );
    expect(card.shareText).toContain('See it on Astralis');
  });

  it('localizes Mongolian copy without changing the result data', () => {
    const card = buildCompatibilityShareCard(
      { ...baseResult, overallScore: 62 },
      {
        locale: 'mn',
        sign1Name: 'Хонь',
        sign2Name: 'Арслан',
      },
    );

    expect(card.scoreLabel).toBe('62% зохицол');
    expect(card.pairLabel).toBe('Хонь + Арслан');
    expect(card.themeTitle).toBe('Өөр хэмнэл, сонирхолтой таталцал');
    expect(card.metricLine).toContain('Хайр 90%');
    expect(card.shareUrl).toContain('utm_source=compatibility_share');
    expect(card.shareUrl).toContain('score=62');
  });

  it('embeds share_ref when provided at share time', () => {
    const ref = createCompatibilityShareRef();
    const url = buildCompatibilityShareUrl('aries', 'leo', 86, {
      appUrl: 'https://example.com',
      shareRef: ref,
    });
    const card = buildCompatibilityShareCard(baseResult, {
      locale: 'en',
      sign1Name: 'Aries',
      sign2Name: 'Leo',
      appUrl: 'https://example.com',
      shareRef: ref,
    });
    expect(url).toBe(card.shareUrl);
    expect(card.shareUrl).toContain(`share_ref=${ref}`);
  });
});
