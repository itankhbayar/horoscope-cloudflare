import { useMemo } from 'react';
import { useAppearance, type AppearanceMode } from '../../hooks/useAppearance';

/** Sanctuary-style tokens shared by Home and tab shell. */
export type SanctuaryPalette = {
  bgDeep: string;
  bgMid: string;
  card: string;
  cardBorder: string;
  lavender: string;
  mint: string;
  paleYellow: string;
  pink: string;
  text: string;
  textMuted: string;
  textSoft: string;
  hole: string;
  glowLavender: string;
  tabBarBg: string;
  tabBarBgEdge: string;
  /** Ring track / clip tint */
  ringTrack: string;
  ringBorder: string;
  /** Small panels (horoscope art, modular illustration wells) */
  artWellBg: string;
  artWellBorder: string;
  /** Underline on zodiac name links */
  textDecorationAccent: string;
};

export const SANCTUARY_DARK: SanctuaryPalette = {
  bgDeep: '#2A255F',
  bgMid: '#3C348C',
  card: '#25245A',
  cardBorder: 'rgba(184, 168, 255, 0.18)',
  lavender: '#B8A8FF',
  mint: '#9FE3C2',
  paleYellow: '#F7E6A6',
  pink: '#F3B6D6',
  text: '#FFFFFF',
  textMuted: 'rgba(232, 225, 255, 0.72)',
  textSoft: 'rgba(232, 225, 255, 0.55)',
  hole: '#1E1A45',
  glowLavender: 'rgba(184, 168, 255, 0.45)',
  tabBarBg: '#0A081C',
  tabBarBgEdge: 'rgba(184, 168, 255, 0.14)',
  ringTrack: 'rgba(255,255,255,0.06)',
  ringBorder: 'rgba(255,255,255,0.14)',
  artWellBg: 'rgba(0,0,0,0.22)',
  artWellBorder: 'rgba(184,168,255,0.22)',
  textDecorationAccent: 'rgba(184,168,255,0.5)',
};

export const SANCTUARY_LIGHT: SanctuaryPalette = {
  bgDeep: '#ECE9FF',
  bgMid: '#D8D2FF',
  card: '#FFFFFF',
  cardBorder: 'rgba(97, 109, 196, 0.22)',
  lavender: '#6B55E5',
  mint: '#2FA87A',
  paleYellow: '#9A7229',
  pink: '#C7519A',
  text: '#181b33',
  textMuted: '#59608b',
  textSoft: 'rgba(24, 27, 51, 0.55)',
  hole: '#F0EDFF',
  glowLavender: 'rgba(107, 85, 229, 0.2)',
  tabBarBg: '#ffffff',
  tabBarBgEdge: 'rgba(97, 109, 196, 0.2)',
  ringTrack: 'rgba(107, 85, 229, 0.12)',
  ringBorder: 'rgba(24, 27, 51, 0.12)',
  artWellBg: 'rgba(107, 85, 229, 0.08)',
  artWellBorder: 'rgba(97, 109, 196, 0.25)',
  textDecorationAccent: 'rgba(107, 85, 229, 0.45)',
};

/** Default dark sanctuary (legacy import sites). */
export const sanctuary = SANCTUARY_DARK;

export function sanctuaryForMode(mode: AppearanceMode): SanctuaryPalette {
  return mode === 'light' ? SANCTUARY_LIGHT : SANCTUARY_DARK;
}

export function useSanctuaryTheme(): SanctuaryPalette {
  const { mode } = useAppearance();
  return useMemo(() => sanctuaryForMode(mode), [mode]);
}
