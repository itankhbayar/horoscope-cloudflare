import { apiRequest } from './apiClient';
import type { City, DailyHoroscope, ZodiacSign } from './types';

export async function fetchDailyHoroscope(sign: ZodiacSign, date?: string): Promise<DailyHoroscope> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiRequest<DailyHoroscope>(`/api/horoscope/daily/${sign}${query}`);
}

export async function fetchMyDailyHoroscope(): Promise<DailyHoroscope> {
  return apiRequest<DailyHoroscope>('/api/horoscope/daily', { auth: true });
}

export async function searchCities(query: string, limit = 10): Promise<City[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return apiRequest<City[]>(`/api/horoscope/cities?${params.toString()}`);
}
