import { localDateISO } from './streaks';

export type StreakFreezeStatus = {
  streakCount?: number | null;
  streakFreezes?: number | null;
  streakLastDate?: string | null;
};

/** Shift an ISO date (YYYY-MM-DD) by a number of days using UTC math. */
export function shiftDateISO(dateISO: string, days: number): string {
  const ms = Date.parse(`${dateISO}T00:00:00.000Z`);
  if (Number.isNaN(ms)) return dateISO;
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * A streak is "at risk" when the user kept a streak, missed exactly yesterday, and
 * still holds at least one freeze. Completing today consumes one freeze and preserves
 * the streak — mirroring the backend inventory logic in recordDailyRitualStreak (a gap
 * is only recoverable when streakLastDate is the day before yesterday). Larger gaps are
 * unrecoverable even with freezes, so we never prompt for them. This reads the existing
 * streak payload only; it does not change any calculation.
 */
export function isStreakAtRisk(status: StreakFreezeStatus, todayISO = localDateISO()): boolean {
  const count = typeof status.streakCount === 'number' ? status.streakCount : 0;
  const freezes = typeof status.streakFreezes === 'number' ? status.streakFreezes : 0;
  if (count <= 0 || freezes <= 0) return false;
  if (!status.streakLastDate) return false;
  // Already counted today — nothing at risk.
  if (status.streakLastDate === todayISO) return false;
  // Missed exactly yesterday: a freeze can still protect the streak today.
  return status.streakLastDate === shiftDateISO(todayISO, -2);
}

/** Freeze inventory remaining after consuming one. Never negative. */
export function freezesAfterUse(freezes: number | null | undefined): number {
  const n = typeof freezes === 'number' ? freezes : 0;
  return Math.max(0, n - 1);
}
