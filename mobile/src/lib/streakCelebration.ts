import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StreakMilestone } from './streakDisplay';

const MILESTONE_CELEBRATION_KEY_PREFIX = 'engagement:streak-milestone-seen';
const DAILY_RITUAL_CELEBRATION_KEY_PREFIX = 'engagement:daily-ritual-completion-seen';

export function milestoneCelebrationKey(milestone: StreakMilestone, streakLastDate: string): string {
  return `${MILESTONE_CELEBRATION_KEY_PREFIX}:${streakLastDate}:${milestone}`;
}

export async function consumeMilestoneCelebration(
  milestone: StreakMilestone | null | undefined,
  streakLastDate: string | null | undefined,
): Promise<StreakMilestone | null> {
  if (!milestone || !streakLastDate) return null;
  const key = milestoneCelebrationKey(milestone, streakLastDate);
  if ((await AsyncStorage.getItem(key)) === '1') return null;
  await AsyncStorage.setItem(key, '1');
  return milestone;
}

export function dailyRitualCelebrationKey(completedDate: string): string {
  return `${DAILY_RITUAL_CELEBRATION_KEY_PREFIX}:${completedDate}`;
}

export async function consumeDailyRitualCelebration(completedDate: string | null | undefined): Promise<boolean> {
  if (!completedDate) return false;
  const key = dailyRitualCelebrationKey(completedDate);
  if ((await AsyncStorage.getItem(key)) === '1') return false;
  await AsyncStorage.setItem(key, '1');
  return true;
}
