import { useCallback, useState } from 'react';
import * as horoscopeService from '@astralis/lib/horoscopeService';
import { getApiLocale } from '@astralis/lib/apiClient';
import type { PeriodHoroscope, PeriodType, ZodiacSign } from '@astralis/lib/types';

const cache = new Map<string, PeriodHoroscope>();

/** Loads weekly/monthly/yearly readings from the period endpoints, mirroring useHoroscope. */
export function usePeriodHoroscope(): {
  reading: PeriodHoroscope | null;
  loading: boolean;
  error: string | null;
  load: (sign: ZodiacSign, periodType: PeriodType) => Promise<void>;
  reset: () => void;
} {
  const [reading, setReading] = useState<PeriodHoroscope | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (sign: ZodiacSign, periodType: PeriodType) => {
    const lang = getApiLocale();
    const key = `${lang}:${periodType}:${sign}`;
    const hit = cache.get(key);
    if (hit) {
      setReading(hit);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await horoscopeService.fetchPeriodHoroscope(sign, periodType);
      cache.set(key, data);
      setReading(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reading');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setReading(null);
    setError(null);
  }, []);

  return { reading, loading, error, load, reset };
}
