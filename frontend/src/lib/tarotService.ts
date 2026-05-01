import { apiRequest, ApiClientError } from './apiClient';
import type { TarotApiResponse, ZodiacSign } from './types';

export interface FetchTarotParams {
  sign: ZodiacSign;
  timezone: string;
  date?: string;
  /** API `lang` query (`en` | `mn`). BCP47 prefixes are normalized. */
  lang?: string;
}

/** Map UI locale / browser tag to API `lang` so Mongolian readings are not skipped. */
export function tarotApiLang(lang: string): 'en' | 'mn' {
  const s = String(lang).trim().toLowerCase();
  if (s === 'mn' || s.startsWith('mn-')) return 'mn';
  return 'en';
}

export async function fetchTarotDaily(params: FetchTarotParams): Promise<TarotApiResponse> {
  const q = new URLSearchParams({
    sign: params.sign,
    timezone: params.timezone,
  });
  if (params.date) q.set('date', params.date);
  if (params.lang != null && String(params.lang).trim() !== '') {
    q.set('lang', tarotApiLang(params.lang));
  }
  return apiRequest<TarotApiResponse>(`/api/tarot?${q.toString()}`, { localized: false });
}

export function isTarotNotFound(err: unknown): boolean {
  return err instanceof ApiClientError && err.status === 404;
}
