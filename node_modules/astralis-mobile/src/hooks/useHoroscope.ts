import { useCallback, useState } from 'react';
import * as horoscopeService from '@astralis/lib/horoscopeService';
import { getApiLocale } from '@astralis/lib/apiClient';
import type { DailyHoroscope, ZodiacSign } from '@astralis/lib/types';

const cache = new Map<string, DailyHoroscope>();

export function useHoroscope(): {
  horoscope: DailyHoroscope | null;
  loading: boolean;
  error: string | null;
  load: (sign: ZodiacSign, date?: string) => Promise<void>;
  loadMine: () => Promise<void>;
  reset: () => void;
} {
  const [horoscope, setHoroscope] = useState<DailyHoroscope | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (sign: ZodiacSign, date?: string) => {
    const lang = getApiLocale();
    const key = `${lang}:${sign}:${date ?? 'today'}`;
    const hit = cache.get(key);
    if (hit) {
      setHoroscope(hit);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await horoscopeService.fetchDailyHoroscope(sign, date);
      cache.set(key, data);
      setHoroscope(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load horoscope');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMine = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await horoscopeService.fetchMyDailyHoroscope();
      setHoroscope(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load horoscope');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setHoroscope(null);
    setError(null);
  }, []);

  return { horoscope, loading, error, load, loadMine, reset };
}
