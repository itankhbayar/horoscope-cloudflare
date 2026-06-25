import { beforeAll, describe, expect, it, vi } from 'vitest';

// Mock useAppearance before importing the theme module
vi.mock('../../hooks/useAppearance', () => ({
  useAppearance: vi.fn(() => ({ mode: 'light' })),
  AppearanceProvider: ({ children }: any) => children,
}));

import { EASTERN_DARK, EASTERN_LIGHT, easternForMode } from './easternTheme';

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
