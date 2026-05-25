import { describe, expect, it, vi, beforeEach } from 'vitest';
import { shareDailyHoroscopeCard } from './horoscopeShareCard';
import type { DailyHoroscope } from '@astralis/lib/types';

const share = vi.hoisted(() => vi.fn(async () => ({ action: 'sharedAction' })));
const track = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('react-native', () => ({
  Share: { share },
  Platform: { OS: 'ios' },
}));

vi.mock('./analytics', () => ({ track }));

const horoscope: DailyHoroscope = {
  sign: 'cancer',
  date: '2026-05-25',
  overall: 'The tenderness you are protecting may be exactly where the honest information lives.',
  love: 'Small changes in tone may hit harder today.',
  career: 'A subtle mood shift may tell you which conversation needs better boundaries.',
  health: 'Hydration, softness, and a little privacy are enough of a ritual for today.',
  luckyNumber: 18,
  luckyColor: 'Pearl White',
};

describe('shareDailyHoroscopeCard', () => {
  beforeEach(() => {
    share.mockClear();
    track.mockClear();
  });

  it('shares the generated image card through native share', async () => {
    await shareDailyHoroscopeCard(horoscope);

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cancer daily horoscope',
        url: expect.stringContaining('data:image/svg+xml'),
      }),
    );
    expect(track).toHaveBeenCalledWith('horoscope_share_card_opened', expect.any(Object));
    expect(track).toHaveBeenCalledWith('horoscope_share_card_generated', expect.any(Object));
    expect(track).toHaveBeenCalledWith('horoscope_share_card_shared', expect.objectContaining({ method: 'native' }));
  });

  it('falls back to message share when image URLs are unsupported', async () => {
    share.mockRejectedValueOnce(new Error('unsupported url'));

    await shareDailyHoroscopeCard(horoscope);

    expect(share).toHaveBeenCalledTimes(2);
    expect(share).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        url: expect.any(String),
      }),
    );
    expect(track).toHaveBeenCalledWith('horoscope_share_card_shared', expect.objectContaining({ method: 'message_fallback' }));
  });
});
