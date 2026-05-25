import { describe, expect, it, vi } from 'vitest';
import { buildHoroscopeShareCardPayload } from './horoscopeShareCard';
import { shareHoroscopeCardOnWeb } from './horoscopeShareWeb';
import type { DailyHoroscope } from './types';

const payload = buildHoroscopeShareCardPayload({
  sign: 'gemini',
  date: '2026-05-25',
  overall: 'The sentence you keep revising is probably less important than the need underneath it.',
  love: 'The subtext may travel through timing, punctuation, and what gets left unsaid.',
  career: 'A message may need less polish and more precision.',
  health: 'Breath, space, and fewer competing inputs are enough of a ritual for today.',
  luckyNumber: 7,
  luckyColor: 'Lavender',
} satisfies DailyHoroscope);

describe('shareHoroscopeCardOnWeb', () => {
  it('falls back to downloading the image when native share is unavailable', async () => {
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const documentRef = {
      body: { appendChild },
      createElement: vi.fn(() => ({
        click,
        remove,
        set href(value: string) {
          expect(value).toContain('data:image/svg+xml');
        },
        set download(value: string) {
          expect(value).toContain('astralis-gemini');
        },
        set rel(_value: string) {},
      })),
    } as unknown as Document;

    const result = await shareHoroscopeCardOnWeb(payload, {
      navigator: {} as Navigator,
      document: documentRef,
    });

    expect(result.method).toBe('download');
    expect(appendChild).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
