import { describe, expect, it, vi } from 'vitest';

// Mock useAppearance so importing the theme module doesn't pull in React Native.
vi.mock('../../hooks/useAppearance', () => ({
  useAppearance: vi.fn(() => ({ mode: 'light' })),
}));

import { EASTERN_DARK, EASTERN_LIGHT, easternForMode, scoreColor } from './easternTheme';

describe('easternForMode', () => {
  it('returns the Ink & Jade (light) palette in light mode', () => {
    expect(easternForMode('light')).toBe(EASTERN_LIGHT);
    expect(easternForMode('light').accent).toBe('#3f7d6e'); // jade
    expect(easternForMode('light').moon).toBeNull(); // no moon in light mode
  });

  it('returns the Lunar Night (dark) palette in dark mode', () => {
    expect(easternForMode('dark')).toBe(EASTERN_DARK);
    expect(easternForMode('dark').accent).toBe('#f0d488'); // gold
    expect(easternForMode('dark').moon).not.toBeNull(); // dark mode has a moon
  });
});

describe('scoreColor', () => {
  it('maps each score band to its level color for the given palette', () => {
    for (const palette of [EASTERN_LIGHT, EASTERN_DARK]) {
      expect(scoreColor(95, palette)).toBe(palette.score.great); // >= 80
      expect(scoreColor(80, palette)).toBe(palette.score.great); // boundary
      expect(scoreColor(70, palette)).toBe(palette.score.good); // >= 60
      expect(scoreColor(50, palette)).toBe(palette.score.ok); // >= 40
      expect(scoreColor(20, palette)).toBe(palette.score.low); // < 40
    }
  });

  it('uses distinct colors per level within each palette', () => {
    for (const palette of [EASTERN_LIGHT, EASTERN_DARK]) {
      const { great, good, ok, low } = palette.score;
      expect(new Set([great, good, ok, low]).size).toBe(4);
    }
  });
});
