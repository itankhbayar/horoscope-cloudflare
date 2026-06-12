import { apiRequest } from './apiClient';
import type {
  City,
  DailyHoroscope,
  DailyRitualCompletion,
  GlobalSkyToday,
  PeriodHoroscope,
  PeriodType,
  PersonalSkyLayer,
  ReflectionState,
  ReflectionSubmitResult,
  Resonance,
  ZodiacSign,
} from './types';

export async function fetchDailyHoroscope(sign: ZodiacSign, date?: string): Promise<DailyHoroscope> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiRequest<DailyHoroscope>(`/api/horoscope/daily/${sign}${query}`);
}

export async function fetchMyDailyHoroscope(): Promise<DailyHoroscope> {
  return apiRequest<DailyHoroscope>('/api/horoscope/daily', { auth: true });
}

export async function fetchPeriodHoroscope(
  sign: ZodiacSign,
  periodType: PeriodType,
  period?: string,
): Promise<PeriodHoroscope> {
  const query = period ? `?period=${encodeURIComponent(period)}` : '';
  return apiRequest<PeriodHoroscope>(`/api/horoscope/${periodType}/${sign}${query}`);
}

export async function completeDailyRitual(): Promise<DailyRitualCompletion> {
  return apiRequest<DailyRitualCompletion>('/api/rituals/daily/complete', { method: 'POST', auth: true });
}

// Accuracy Loop — evening check-in. Submit (or overwrite) how the reading landed.
export async function submitReflection(readingDate: string, resonance: Resonance): Promise<ReflectionSubmitResult> {
  return apiRequest<ReflectionSubmitResult>('/api/reflections/daily', {
    method: 'POST',
    auth: true,
    body: { readingDate, resonance },
  });
}

// Accuracy Loop — drives the morning acknowledgment block and the evening check-in card.
export async function fetchReflectionState(date?: string): Promise<ReflectionState> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiRequest<ReflectionState>(`/api/reflections/state${query}`, { auth: true });
}

export async function fetchGlobalSkyToday(date?: string): Promise<GlobalSkyToday> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiRequest<GlobalSkyToday>(`/api/horoscope/global-sky${query}`);
}

export async function fetchPersonalSkyLayer(input: { sign: ZodiacSign; date?: string } | { birthDate: string; date?: string }): Promise<PersonalSkyLayer> {
  const params = new URLSearchParams();
  if ('sign' in input) params.set('sign', input.sign);
  if ('birthDate' in input) params.set('birthDate', input.birthDate);
  if (input.date) params.set('date', input.date);
  return apiRequest<PersonalSkyLayer>(`/api/horoscope/personal-sky?${params.toString()}`);
}

export async function searchCities(query: string, limit = 10): Promise<City[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return apiRequest<City[]>(`/api/horoscope/cities?${params.toString()}`);
}
