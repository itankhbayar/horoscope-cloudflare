import { describe, expect, it, vi } from 'vitest';
import { isValidShareImageFile, nativeShareWithImageFallback } from './webShare';

describe('isValidShareImageFile', () => {
  it('rejects empty or tiny files', () => {
    expect(isValidShareImageFile(new File([], 'card.png', { type: 'image/png' }))).toBe(false);
    expect(isValidShareImageFile(new File([new Uint8Array(10)], 'card.png', { type: 'image/png' }))).toBe(false);
  });

  it('accepts a reasonably sized png', () => {
    const bytes = new Uint8Array(400);
    expect(isValidShareImageFile(new File([bytes], 'astralis-gemini.png', { type: 'image/png' }))).toBe(true);
  });
});

describe('nativeShareWithImageFallback', () => {
  it('falls back to text-only when the image file is empty', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const navigatorRef = { share, canShare: () => true } as unknown as Navigator;
    const empty = new File([], 'broken.png', { type: 'image/png' });

    const outcome = await nativeShareWithImageFallback(navigatorRef, {
      title: 'Gemini',
      text: 'Line one\n\nhttps://astralis.app/horoscope/gemini/today',
      file: empty,
      url: 'https://astralis.app/horoscope/gemini/today',
    });

    expect(outcome).toBe('text');
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0]?.[0]).not.toHaveProperty('files');
    expect(share.mock.calls[0]?.[0].text).toContain('astralis.app');
  });
});
