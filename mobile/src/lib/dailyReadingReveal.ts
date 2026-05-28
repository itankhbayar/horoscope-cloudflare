import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'engagement:daily-reading-revealed';

function revealKey(dateISO: string, userId?: string | null): string {
  return `${KEY_PREFIX}:${userId ?? 'guest'}:${dateISO}`;
}

export async function loadDailyReadingReveal(dateISO: string, userId?: string | null): Promise<boolean> {
  return (await AsyncStorage.getItem(revealKey(dateISO, userId))) === '1';
}

export async function saveDailyReadingReveal(dateISO: string, userId?: string | null): Promise<void> {
  await AsyncStorage.setItem(revealKey(dateISO, userId), '1');
}
