import { describe, expect, it, vi } from 'vitest';
import { generateStreakMilestoneCardSvg, shareStreakMilestoneCard, streakMilestoneCardDataUrl } from './streakShare';

const share = vi.hoisted(() => vi.fn(async () => ({ action: 'sharedAction' })));

vi.mock('react-native', () => ({
  Share: { share },
}));

describe('streak milestone sharing', () => {
  it('generates a mystical story-sized SVG milestone card', () => {
    const svg = generateStreakMilestoneCardSvg({
      milestone: 30,
      zodiacSign: 'leo',
      displayName: 'Mira',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('height="1920"');
    expect(svg).toContain('30');
    expect(svg).toContain('\u264C');
    expect(svg).toContain('My cosmic rhythm is glowing');
  });

  it('creates a shareable data URL', () => {
    expect(streakMilestoneCardDataUrl({ milestone: 7 })).toMatch(/^data:image\/svg\+xml;utf8,/);
  });

  it('shares the generated milestone card through native share', async () => {
    await shareStreakMilestoneCard({ milestone: 7, zodiacSign: 'aries' });

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '7-day cosmic rhythm',
        message: expect.stringContaining('7 nights aligned'),
        url: expect.stringMatching(/^data:image\/svg\+xml;utf8,/),
      }),
    );
  });

  it('falls back to message-only sharing when card URLs are rejected', async () => {
    share.mockRejectedValueOnce(new Error('unsupported url'));

    await shareStreakMilestoneCard({ milestone: 7, zodiacSign: 'aries' });

    expect(share).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: '7-day cosmic rhythm',
        message: expect.stringContaining('7 nights aligned'),
      }),
    );
    const lastCall = share.mock.calls[share.mock.calls.length - 1] as unknown[] | undefined;
    expect(lastCall?.[0]).not.toHaveProperty('url');
  });
});
