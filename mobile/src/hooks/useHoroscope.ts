import { useCallback, useState } from 'react';
import * as horoscopeService from '@astralis/lib/horoscopeService';
import { getApiLocale } from '@astralis/lib/apiClient';
import type { DailyHoroscope, DailyRitualCompletion, ZodiacSign } from '@astralis/lib/types';

const cache = new Map<string, DailyHoroscope>();
const HOROSCOPE_CACHE_VERSION = 'v2';

function hasPremiumDepthBlocks(horoscope: DailyHoroscope, lang: string): boolean {
  if (lang !== 'mn') return true;
  return Array.isArray(horoscope.blocks) && horoscope.blocks.length >= 6;
}

export function useHoroscope(): {
  horoscope: DailyHoroscope | null;
  loading: boolean;
  error: string | null;
  load: (sign: ZodiacSign, date?: string) => Promise<void>;
  loadMine: () => Promise<void>;
  completeToday: () => Promise<DailyRitualCompletion>;
  reset: () => void;
} {
  const [horoscope, setHoroscope] = useState<DailyHoroscope | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (sign: ZodiacSign, date?: string) => {
    const lang = getApiLocale();
    const key = `${HOROSCOPE_CACHE_VERSION}:${lang}:${sign}:${date ?? 'today'}`;
    const hit = cache.get(key);
    if (hit && hasPremiumDepthBlocks(hit, lang)) {
      setHoroscope(hit);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await horoscopeService.fetchDailyHoroscope(sign, date);
      if (lang === 'mn' && !hasPremiumDepthBlocks(data, lang)) {
        cache.delete(key);
      }
      cache.set(key, data);
      setHoroscope(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sky reading');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMine = useCallback(async () => {
    const lang = getApiLocale();
    setLoading(true);
    setError(null);
    try {
      const data = await horoscopeService.fetchMyDailyHoroscope();
      if (lang === 'mn' && !hasPremiumDepthBlocks(data, lang)) {
        const retry = await horoscopeService.fetchMyDailyHoroscope();
        setHoroscope(retry);
        return;
      }
      setHoroscope(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sky reading');
    } finally {
      setLoading(false);
    }
  }, []);

  const completeToday = useCallback(async () => {
    const completion = await horoscopeService.completeDailyRitual();
    setHoroscope((current) =>
      current
        ? {
            ...current,
            streakCount: completion.currentStreak,
            longestStreakCount: completion.longestStreak,
            streakLastDate: completion.streakLastDate,
            streakFreezes: completion.freezeCount,
            streakFreezeAwarded: completion.streakFreezeAwarded,
            streakFreezeCap: completion.freezeCap,
            streakFreezeAwardReason: completion.streakFreezeAwardReason,
            isNewStreakDay: completion.shouldCelebrate,
            streakPreservedByFreeze: completion.streakPreservedByFreeze,
            milestoneReached: completion.shouldCelebrate ? completion.milestoneReached : null,
            nextMilestone: completion.nextMilestone,
            streakSegment: completion.streakSegment,
          }
        : current,
    );
    return completion;
  }, []);

  const reset = useCallback(() => {
    setHoroscope(null);
    setError(null);
  }, []);

  return { horoscope, loading, error, load, loadMine, completeToday, reset };
}
