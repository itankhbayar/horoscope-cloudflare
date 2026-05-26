import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'engagement:daily-streak';

export type DailyStreak = {
  count: number;
  lastCheckInDate: string | null;
};

export function localDateISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const aMs = Date.parse(`${a}T00:00:00.000Z`);
  const bMs = Date.parse(`${b}T00:00:00.000Z`);
  return Math.round((bMs - aMs) / 86_400_000);
}

export function nextDailyStreak(current: DailyStreak, today = localDateISO()): DailyStreak {
  if (current.lastCheckInDate === today) return current;
  if (!current.lastCheckInDate) return { count: 1, lastCheckInDate: today };
  const gap = daysBetween(current.lastCheckInDate, today);
  return {
    count: gap === 1 ? current.count + 1 : 1,
    lastCheckInDate: today,
  };
}

export async function loadDailyStreak(): Promise<DailyStreak> {
  const raw = await AsyncStorage.getItem(STREAK_KEY);
  if (!raw) return { count: 0, lastCheckInDate: null };
  try {
    const parsed = JSON.parse(raw) as Partial<DailyStreak>;
    return {
      count: typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : 0,
      lastCheckInDate: typeof parsed.lastCheckInDate === 'string' ? parsed.lastCheckInDate : null,
    };
  } catch {
    return { count: 0, lastCheckInDate: null };
  }
}

export async function checkInDaily(today = localDateISO()): Promise<DailyStreak> {
  const current = await loadDailyStreak();
  const next = nextDailyStreak(current, today);
  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(next));
  return next;
}

export async function saveDailyStreak(next: DailyStreak): Promise<DailyStreak> {
  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(next));
  return next;
}
