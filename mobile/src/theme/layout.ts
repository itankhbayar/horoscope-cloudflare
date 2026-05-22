import type { Insets } from 'react-native';

/** Minimum comfortable touch target (Apple HIG / Material). */
export const MIN_TOUCH = 44;

export const hitSlopComfortable = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const hitSlopLarge = { top: 12, bottom: 12, left: 12, right: 12 } as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

/** Horizontal padding tuned for 320–414+ and tablets. */
export function horizontalScreenPadding(screenWidth: number): number {
  if (screenWidth >= 768) return spacing.xxl;
  if (screenWidth <= 320) return spacing.md;
  if (screenWidth <= 360) return spacing.lg;
  return spacing.lg + 2;
}

export function screenTitleSize(screenWidth: number): number {
  if (screenWidth <= 320) return 19;
  if (screenWidth >= 768) return 24;
  return 21;
}

export function brandTitleSize(screenWidth: number): number {
  if (screenWidth <= 320) return 24;
  if (screenWidth >= 768) return 30;
  return 27;
}

export function bodyFontSize(screenWidth: number): number {
  if (screenWidth <= 320) return 14;
  return 15;
}

export function bodyLineHeight(screenWidth: number): number {
  return Math.round(bodyFontSize(screenWidth) * 1.45);
}

export function cardTitleSize(screenWidth: number): number {
  if (screenWidth <= 320) return 16;
  return 17;
}

/** Bottom inset for scroll content above tab bar + home indicator (tabs consume bottom safe area). */
export function tabScrollBottomPadding(insets: Insets, extra: number = spacing.xxl): number {
  const bottom = insets.bottom ?? 0;
  return Math.max(bottom, spacing.md) + extra;
}
