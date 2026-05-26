import type { AtmosphereKey, GlobalSkyToday, PersonalSkyLayer } from '@astralis/lib/types';

export type AmbientThemeKey =
  | 'moonlit-stillness'
  | 'tense-night'
  | 'warm-social'
  | 'dream-haze'
  | 'clear-sky';

export type AmbientRitualTheme = {
  key: AmbientThemeKey;
  label: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  overlayTop: string;
  overlayBottom: string;
  glowOpacity: number;
  particleOpacity: number;
  cardRadius: number;
  cardGap: number;
  readingLineHeight: number;
  transitionMs: number;
  shimmerMs: number;
  hapticMs: number;
  density: 'spacious' | 'balanced' | 'quiet';
  soundscape: {
    id: 'none' | 'low-wind' | 'distant-night' | 'soft-room';
    label: string;
    premium: boolean;
  };
};

export type AmbientRitualState = {
  theme: AmbientRitualTheme;
  singleLine: string;
  pauseLabel: string;
  quietModeRecommended: boolean;
};

function strongestAtmosphere(atmosphere: Record<AtmosphereKey, number>): AtmosphereKey {
  return Object.entries(atmosphere).sort((a, b) => b[1] - a[1])[0]?.[0] as AtmosphereKey ?? 'reflection';
}

function themeKeyFor(sky: GlobalSkyToday, personal?: PersonalSkyLayer | null): AmbientThemeKey {
  const atmosphere = personal?.sky.atmosphere ?? sky.atmosphere;
  const strongest = strongestAtmosphere(atmosphere);
  if (atmosphere.tension >= 64 || atmosphere.emotionalVolatility >= 66) return 'tense-night';
  if (atmosphere.socialOpenness >= 60 || strongest === 'socialOpenness') return 'warm-social';
  if (sky.moonPhase.includes('Waning') || atmosphere.reflection >= 62) return 'moonlit-stillness';
  if (sky.moonPhase.includes('New') || strongest === 'uncertainty') return 'dream-haze';
  if (atmosphere.clarity >= 60) return 'clear-sky';
  return 'moonlit-stillness';
}

export function buildAmbientRitualTheme(
  sky: GlobalSkyToday,
  options: { personal?: PersonalSkyLayer | null; quietHour?: boolean; reducedMotion?: boolean; premium?: boolean } = {},
): AmbientRitualTheme {
  const key = themeKeyFor(sky, options.personal);
  const quiet = Boolean(options.quietHour);
  const reduced = Boolean(options.reducedMotion);
  const premium = Boolean(options.premium);
  const base = THEMES[key];
  return {
    ...base,
    glowOpacity: quiet ? Math.max(0.08, base.glowOpacity - 0.08) : base.glowOpacity,
    particleOpacity: reduced ? 0 : quiet ? Math.max(0.02, base.particleOpacity - 0.06) : base.particleOpacity,
    cardGap: quiet ? base.cardGap + 4 : base.cardGap,
    transitionMs: reduced ? 0 : quiet ? base.transitionMs + 180 : base.transitionMs,
    shimmerMs: reduced ? 0 : premium ? base.shimmerMs + 900 : base.shimmerMs,
    hapticMs: reduced ? 0 : quiet ? 6 : base.hapticMs,
    soundscape: premium ? base.soundscape : { id: 'none', label: 'Silent by default', premium: false },
  };
}

export function buildAmbientRitualState(
  sky: GlobalSkyToday,
  personal?: PersonalSkyLayer | null,
  options: { quietHour?: boolean; reducedMotion?: boolean; premium?: boolean } = {},
): AmbientRitualState {
  const theme = buildAmbientRitualTheme(sky, { ...options, personal });
  const line = personal?.howTonightAffectsYou ?? sky.headline;
  return {
    theme,
    singleLine: shorten(line),
    pauseLabel: options.quietHour ? 'A slower rhythm for the last hour.' : 'Take one quiet breath before reading.',
    quietModeRecommended:
      options.quietHour === true ||
      sky.atmosphere.reflection >= 60 ||
      sky.atmosphere.emotionalVolatility >= 62 ||
      sky.moonPhase.includes('Waning'),
  };
}

export function ambientFatigueRisk(textBlocks: string[]): 'low' | 'medium' | 'high' {
  const total = textBlocks.join(' ').trim().split(/\s+/).filter(Boolean).length;
  if (total > 170) return 'high';
  if (total > 105) return 'medium';
  return 'low';
}

function shorten(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= 136) return clean;
  const truncated = clean.slice(0, 132).replace(/\s+\S*$/, '');
  return `${truncated}.`;
}

const THEMES: Record<AmbientThemeKey, AmbientRitualTheme> = {
  'moonlit-stillness': {
    key: 'moonlit-stillness',
    label: 'Reflective moonlit stillness',
    background: '#050711',
    surface: 'rgba(18, 21, 40, 0.82)',
    text: '#f2f0ff',
    muted: '#aaaed0',
    accent: '#d8d7ff',
    overlayTop: 'rgba(216, 215, 255, 0.10)',
    overlayBottom: 'rgba(41, 67, 86, 0.18)',
    glowOpacity: 0.18,
    particleOpacity: 0.12,
    cardRadius: 24,
    cardGap: 18,
    readingLineHeight: 25,
    transitionMs: 720,
    shimmerMs: 4200,
    hapticMs: 8,
    density: 'spacious',
    soundscape: { id: 'distant-night', label: 'Distant night air', premium: true },
  },
  'tense-night': {
    key: 'tense-night',
    label: 'Emotionally direct night',
    background: '#090711',
    surface: 'rgba(33, 20, 35, 0.84)',
    text: '#fff4f8',
    muted: '#d5b7c6',
    accent: '#f3b6d6',
    overlayTop: 'rgba(243, 182, 214, 0.10)',
    overlayBottom: 'rgba(67, 35, 55, 0.22)',
    glowOpacity: 0.24,
    particleOpacity: 0.08,
    cardRadius: 22,
    cardGap: 20,
    readingLineHeight: 26,
    transitionMs: 860,
    shimmerMs: 5200,
    hapticMs: 5,
    density: 'quiet',
    soundscape: { id: 'soft-room', label: 'Soft room tone', premium: true },
  },
  'warm-social': {
    key: 'warm-social',
    label: 'Warm social openness',
    background: '#07080f',
    surface: 'rgba(38, 32, 35, 0.82)',
    text: '#fff7eb',
    muted: '#d9c6a7',
    accent: '#f2cf8d',
    overlayTop: 'rgba(242, 207, 141, 0.11)',
    overlayBottom: 'rgba(76, 52, 36, 0.18)',
    glowOpacity: 0.2,
    particleOpacity: 0.14,
    cardRadius: 24,
    cardGap: 16,
    readingLineHeight: 24,
    transitionMs: 680,
    shimmerMs: 3800,
    hapticMs: 8,
    density: 'balanced',
    soundscape: { id: 'low-wind', label: 'Low warm wind', premium: true },
  },
  'dream-haze': {
    key: 'dream-haze',
    label: 'Quiet dreamlike haze',
    background: '#060613',
    surface: 'rgba(23, 23, 48, 0.84)',
    text: '#f4efff',
    muted: '#b7acd2',
    accent: '#c3a6ff',
    overlayTop: 'rgba(195, 166, 255, 0.11)',
    overlayBottom: 'rgba(28, 49, 77, 0.20)',
    glowOpacity: 0.22,
    particleOpacity: 0.1,
    cardRadius: 26,
    cardGap: 22,
    readingLineHeight: 27,
    transitionMs: 980,
    shimmerMs: 5600,
    hapticMs: 4,
    density: 'spacious',
    soundscape: { id: 'distant-night', label: 'Distant night air', premium: true },
  },
  'clear-sky': {
    key: 'clear-sky',
    label: 'High-clarity sky tone',
    background: '#041018',
    surface: 'rgba(12, 34, 45, 0.82)',
    text: '#effcff',
    muted: '#a8cbd2',
    accent: '#9be6e1',
    overlayTop: 'rgba(155, 230, 225, 0.10)',
    overlayBottom: 'rgba(17, 67, 79, 0.20)',
    glowOpacity: 0.16,
    particleOpacity: 0.12,
    cardRadius: 20,
    cardGap: 16,
    readingLineHeight: 24,
    transitionMs: 620,
    shimmerMs: 3600,
    hapticMs: 7,
    density: 'balanced',
    soundscape: { id: 'low-wind', label: 'Low clear wind', premium: true },
  },
};
