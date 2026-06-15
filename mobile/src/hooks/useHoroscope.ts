import { useCallback, useState } from 'react';
import * as horoscopeService from '@astralis/lib/horoscopeService';
import { getApiLocale } from '@astralis/lib/apiClient';
import type { DailyHoroscope, DailyRitualCompletion, ZodiacSign } from '@astralis/lib/types';

const cache = new Map<string, DailyHoroscope>();
// Bumped to v3: the previous version gated on `blocks.length >= 6` as a "premium depth" signal.
// That was inverted — the canonical Claude reading carries its richness in overall/love/career/
// health and ships with NO blocks, while only the generic template fallback emits blocks. The old
// check therefore treated every real reading as "not deep enough", forcing a redundant second
// fetch (loadMine) and a delete-then-set cache thrash (load). Dropping it aligns mobile with web.
const HOROSCOPE_CACHE_VERSION = 'v3';

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
    // Resolve the literal "today" to a concrete UTC calendar date (matching the backend default).
    // Keying on the resolved date — and sending it in the request URL — means each day gets its
    // own cache entry and its own edge-cache URL, so a kept-open app rolls over at midnight
    // instead of serving the reading it first fetched days ago. Mirrors the web composable.
    const resolvedDate = date ?? new Date().toISOString().slice(0, 10);
    const key = `${HOROSCOPE_CACHE_VERSION}:${lang}:${sign}:${resolvedDate}`;
    const hit = cache.get(key);
    if (hit) {
      setHoroscope(hit);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await horoscopeService.fetchDailyHoroscope(sign, resolvedDate);
      cache.set(key, data);
      setHoroscope(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sky reading');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMine = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHoroscope(await horoscopeService.fetchMyDailyHoroscope());
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
