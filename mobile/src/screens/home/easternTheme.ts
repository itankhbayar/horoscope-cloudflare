import { useMemo } from 'react';
import { useAppearance, type AppearanceMode } from '../../hooks/useAppearance';

/**
 * Eastern (Chinese zodiac) Home theme. Deliberately distinct from the Western
 * sanctuaryTheme: Ink & Jade in light mode, Lunar Night in dark mode. Selected
 * by the same app-wide appearance mode (see useAppearance), mirroring
 * sanctuaryForMode / useSanctuaryTheme.
 */
export type EasternPalette = {
  /** Solid scroll background. */
  bgBase: string;
  /** Two soft decorative glow orbs layered over bgBase. */
  glowA: string;
  glowB: string;
  /** Dark-mode moon fill; null in light mode (no moon). */
  moon: string | null;
  moonGlow: string;
  /** Cards (hero + reading). */
  card: string;
  cardBorder: string;
  /** Hero attribute chips. */
  chipBg: string;
  chipBorder: string;
  /** Eyebrows, active picker/period states, block titles. */
  accent: string;
  /** Text drawn on top of an accent-filled element (selected period pill). */
  onAccent: string;
  /** Hero animal name. */
  animalName: string;
  text: string;
  textMuted: string;
  divider: string;
  /**
   * Semantic compatibility-score colors, tuned per theme so each level stays
   * legible while preserving meaning: great >= 80, good >= 60, ok >= 40, low < 40.
   */
  score: {
    great: string;
    good: string;
    ok: string;
    low: string;
  };
};

/** Ink & Jade — warm rice-paper, jade accent. */
export const EASTERN_LIGHT: EasternPalette = {
  bgBase: '#efe8d8',
  glowA: 'rgba(63, 125, 110, 0.10)',
  glowB: 'rgba(184, 137, 58, 0.08)',
  moon: null,
  moonGlow: 'transparent',
  card: '#fdfbf4',
  cardBorder: '#d8cfb8',
  chipBg: '#ffffff',
  chipBorder: '#c9bfa6',
  accent: '#3f7d6e',
  onAccent: '#ffffff',
  animalName: '#2b2b28',
  text: '#2b2b28',
  textMuted: '#7a7264',
  divider: '#d8cfb8',
  score: {
    great: '#3f8f5e', // deep jade-green
    good: '#b8893a', // amber
    ok: '#d2733a', // burnt orange
    low: '#c0453f', // brick red
  },
};

/** Lunar Night — deep teal, gold accent, gold moon. */
export const EASTERN_DARK: EasternPalette = {
  bgBase: '#0c2630',
  glowA: 'rgba(21, 65, 74, 0.90)',
  glowB: 'rgba(240, 212, 136, 0.10)',
  moon: '#f0d488',
  moonGlow: 'rgba(245, 227, 163, 0.45)',
  card: 'rgba(7, 24, 31, 0.60)',
  cardBorder: '#4f7f7a',
  chipBg: 'rgba(240, 212, 136, 0.12)',
  chipBorder: '#4f7f7a',
  accent: '#f0d488',
  onAccent: '#0c2630',
  animalName: '#f0d488',
  text: '#e7f1ee',
  textMuted: '#9fc1ba',
  divider: '#4f7f7a',
  score: {
    great: '#7bd49a', // bright mint
    good: '#f0d488', // gold
    ok: '#f6a96b', // warm orange
    low: '#ef7a7a', // soft red
  },
};

export function easternForMode(mode: AppearanceMode): EasternPalette {
  return mode === 'light' ? EASTERN_LIGHT : EASTERN_DARK;
}

/** Map a 0–100 compatibility score to its semantic color for the active palette. */
export function scoreColor(score: number, palette: EasternPalette): string {
  if (score >= 80) return palette.score.great;
  if (score >= 60) return palette.score.good;
  if (score >= 40) return palette.score.ok;
  return palette.score.low;
}

export function useEasternTheme(): EasternPalette {
  const { mode } = useAppearance();
  return useMemo(() => easternForMode(mode), [mode]);
}
