export type ZodiacMode = 'western' | 'chinese';

/** The "Today" (daily reading) landing path for each mode. */
export const ZODIAC_TODAY: Record<ZodiacMode, string> = {
  western: '/today',
  chinese: '/chinese/today',
};

/**
 * Feature pages that have a 1:1 counterpart in the other mode. Keyed by the mode
 * the path belongs to, mapping that path to its sibling in the opposite mode.
 */
const COUNTERPARTS: Record<ZodiacMode, Record<string, string>> = {
  western: {
    '/today': '/chinese/today',
    '/compatibility': '/chinese/compatibility',
    '/chart': '/chinese/chart',
  },
  chinese: {
    '/chinese/today': '/today',
    '/chinese/compatibility': '/compatibility',
    '/chinese/chart': '/chart',
  },
};

/** Pages that exist only in Western mode and have no Chinese counterpart. */
const WESTERN_ONLY_FEATURES = new Set<string>(['/tarot']);

/**
 * Where to go when switching to `targetMode` from `currentPath`.
 * - A feature page with a counterpart → that counterpart.
 * - A western-only feature (e.g. Tarot) when switching to Chinese → Chinese Today.
 * - Anything else (Premium, Profile, marketing, deep links) → null = stay put.
 */
export function resolveModeNavigation(
  currentPath: string,
  targetMode: ZodiacMode,
): string | null {
  const fromMode: ZodiacMode = targetMode === 'western' ? 'chinese' : 'western';
  const counterpart = COUNTERPARTS[fromMode][currentPath];
  if (counterpart) return counterpart;
  if (targetMode === 'chinese' && WESTERN_ONLY_FEATURES.has(currentPath)) {
    return ZODIAC_TODAY.chinese;
  }
  return null;
}
