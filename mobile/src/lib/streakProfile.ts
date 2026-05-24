import { formatFreezeCapacity, formatFreezeSafeguard, longestStreakCopy } from './streakDisplay';

export type RitualHistoryDay = {
  date: string;
  completed: boolean;
};

export function profileStreakLines(input: {
  streakCount?: number | null;
  longestStreakCount?: number | null;
  streakFreezes?: number | null;
  streakFreezeCap?: number | null;
}): string[] {
  const current = typeof input.streakCount === 'number' ? input.streakCount : 0;
  const longest = typeof input.longestStreakCount === 'number' ? input.longestStreakCount : 0;
  const freezes = typeof input.streakFreezes === 'number' ? input.streakFreezes : 0;
  const cap = typeof input.streakFreezeCap === 'number' ? input.streakFreezeCap : null;
  const freeze = formatFreezeSafeguard(freezes);
  const capacity = cap ? formatFreezeCapacity(freezes, cap) : freeze;
  return [
    current > 0 ? `Current cosmic rhythm: ${current} days` : 'Current cosmic rhythm: ready to begin',
    longestStreakCopy(longest),
    ...(capacity ? [capacity] : []),
  ];
}

export function normalizeRitualHistory(value: unknown): RitualHistoryDay[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (day): day is RitualHistoryDay =>
        Boolean(day) &&
        typeof (day as RitualHistoryDay).date === 'string' &&
        typeof (day as RitualHistoryDay).completed === 'boolean',
    )
    .slice(-30);
}

export function ritualHistoryCompletedCount(history: RitualHistoryDay[]): number {
  return history.filter((day) => day.completed).length;
}
