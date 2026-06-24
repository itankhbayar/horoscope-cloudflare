import { apiRequest } from './apiClient';
import type {
  ChineseAnimal,
  ChineseDailyReading,
  ChinesePeriodReading,
  ChineseProfile,
  PeriodType,
} from './types';

export async function fetchChineseDaily(animal: ChineseAnimal, date?: string): Promise<ChineseDailyReading> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiRequest<ChineseDailyReading>(`/api/chinese/daily/${animal}${query}`);
}

export async function fetchChinesePeriod(
  animal: ChineseAnimal,
  periodType: PeriodType,
  period?: string,
): Promise<ChinesePeriodReading> {
  const query = period ? `?period=${encodeURIComponent(period)}` : '';
  return apiRequest<ChinesePeriodReading>(`/api/chinese/${periodType}/${animal}${query}`);
}

/** The signed-in user's Chinese-zodiac birth profile (derived from their stored birth date). */
export async function fetchChineseProfile(): Promise<ChineseProfile> {
  return apiRequest<ChineseProfile>('/api/chinese/profile', { auth: true });
}

/** Public: derive a Chinese-zodiac profile from any birth date (no account needed). */
export async function fetchChineseProfilePreview(birthDate: string): Promise<ChineseProfile> {
  return apiRequest<ChineseProfile>(`/api/chinese/profile/preview?birthDate=${encodeURIComponent(birthDate)}`);
}
