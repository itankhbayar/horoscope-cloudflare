import { ref } from 'vue';
import { horoscopeService } from '../lib';
import { getApiLocale } from '../lib/apiClient';
import type { DailyHoroscope, DailyRitualCompletion, ZodiacSign } from '../lib/types';
import { track } from '../lib/analytics';
import { captureFrontendException } from '../lib/errorTracking';

const cache = new Map<string, DailyHoroscope>();

export function useHoroscope() {
  const horoscope = ref<DailyHoroscope | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(sign: ZodiacSign, date?: string): Promise<void> {
    const lang = getApiLocale();
    // Key by the resolved calendar date — never the literal "today". In a long-lived session
    // (kept-open tab / installed PWA) a "today" key never rolls over, so the app would keep
    // serving the reading it first fetched days ago. Using the actual date (UTC, matching the
    // backend's default) makes the key change at midnight so a new day fetches fresh.
    const resolvedDate = date ?? new Date().toISOString().slice(0, 10);
    const key = `${lang}:${sign}:${resolvedDate}`;
    if (cache.has(key)) {
      horoscope.value = cache.get(key)!;
      track('horoscope_viewed', { sign, date: resolvedDate, source: 'memory_cache' });
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      // Send the explicit date so it lands in the request URL. Without it the URL is date-less
      // and Cloudflare's edge cache (s-maxage 6h) keeps serving yesterday's reading for hours
      // after midnight. A dated URL gives each day its own cache entry.
      const data = await horoscopeService.fetchDailyHoroscope(sign, resolvedDate);
      cache.set(key, data);
      horoscope.value = data;
      track('horoscope_viewed', { sign, date: data.date, lang, source: 'api' });
    } catch (err) {
      error.value = (err as Error).message;
      captureFrontendException(err, { feature: { name: 'horoscope', sign } });
    } finally {
      loading.value = false;
    }
  }

  async function loadMine(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      horoscope.value = await horoscopeService.fetchMyDailyHoroscope();
      track('horoscope_viewed', { source: 'personalized' });
    } catch (err) {
      error.value = (err as Error).message;
      captureFrontendException(err, { feature: { name: 'horoscope_personalized' } });
    } finally {
      loading.value = false;
    }
  }

  async function completeToday(): Promise<DailyRitualCompletion> {
    const completion = await horoscopeService.completeDailyRitual();
    if (horoscope.value) {
      horoscope.value = {
        ...horoscope.value,
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
      };
    }
    return completion;
  }

  function reset(): void {
    horoscope.value = null;
    error.value = null;
  }

  return { horoscope, loading, error, load, loadMine, completeToday, reset };
}
