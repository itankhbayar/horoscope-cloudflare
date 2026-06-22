import { apiRequest } from './apiClient';
import type { ChartReadingResponse } from './types';

/**
 * Premium personalized natal-chart reading. Generated once per chart by Claude and cached
 * server-side, so the first call may take ~20–40s (Opus) and later calls return instantly.
 */
export async function fetchChartReading(lang?: string): Promise<ChartReadingResponse> {
  const q = new URLSearchParams();
  if (lang != null && String(lang).trim() !== '') {
    q.set('lang', String(lang).trim().toLowerCase().startsWith('mn') ? 'mn' : 'en');
  }
  const qs = q.toString();
  return apiRequest<ChartReadingResponse>(`/api/chart/reading${qs ? `?${qs}` : ''}`, {
    method: 'POST',
    auth: true,
    localized: false,
    // First generation calls Opus and can take well over the default 15s — give it room.
    timeoutMs: 90_000,
  });
}
