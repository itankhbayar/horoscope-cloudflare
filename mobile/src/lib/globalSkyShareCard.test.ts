import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shareGlobalSkyCard } from './globalSkyShareCard';
import type { GlobalSkyToday } from '@astralis/lib/types';

const share = vi.hoisted(() => vi.fn(async () => ({ action: 'sharedAction' })));
const track = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('react-native', () => ({
  Share: { share },
  Platform: { OS: 'ios' },
}));

vi.mock('./analytics', () => ({ track }));

const sky: GlobalSkyToday = {
  date: '2026-05-25',
  moonSign: 'scorpio',
  moonPhase: 'Waxing Gibbous',
  headline: 'The Moon in Scorpio sharpens emotional pattern recognition tonight.',
  summary: 'Tonight favors honesty over harmony, especially where silence has been doing too much work.',
  shareLine: 'Conversations carry more hidden meaning than usual under Mercury tension.',
  atmosphere: {
    tension: 72,
    intimacy: 76,
    clarity: 48,
    momentum: 42,
    uncertainty: 58,
    reflection: 64,
    socialOpenness: 38,
    emotionalVolatility: 68,
  },
  cards: [
    {
      id: 'moon-signal',
      title: 'Moon signal',
      body: 'The Moon crossing Scorpio intensifies emotional pattern recognition tonight.',
      signal: 'intimacy',
    },
  ],
  majorAspects: [],
  mercuryActivity: 'Mercury is running clean enough for direct language, but not so clean that subtext disappears.',
  venusMarsTension: 'Venus and Mars are close enough to make desire feel less tidy than usual.',
  retrogradeBodies: [],
  eclipseWindow: { active: false, note: 'No eclipse label is applied without node proximity data.' },
};

describe('shareGlobalSkyCard', () => {
  beforeEach(() => {
    share.mockReset();
    track.mockReset();
    share.mockResolvedValue({ action: 'sharedAction' });
  });

  it('uses existing global sky data and does not add private birth data', async () => {
    await shareGlobalSkyCard(sky);

    const payload = (share.mock.calls as unknown as Array<[Record<string, unknown>]>)[0]?.[0];
    expect(payload).toMatchObject({
      title: 'Global sky today',
      url: expect.stringContaining('data:image/svg+xml'),
    });
    const serialized = JSON.stringify(payload);
    expect(serialized).toContain(sky.headline);
    expect(serialized).not.toMatch(/birthCity|birthTime|email|userId|latitude|longitude/i);
  });

  it('falls back to message share when native image sharing fails', async () => {
    share.mockRejectedValueOnce(new Error('unsupported url'));

    await shareGlobalSkyCard(sky);

    expect(share).toHaveBeenCalledTimes(2);
    expect(share).toHaveBeenLastCalledWith(expect.not.objectContaining({ url: expect.any(String) }));
    expect(track).toHaveBeenCalledWith('horoscope_share_card_shared', expect.objectContaining({ method: 'message_fallback' }));
  });
});
