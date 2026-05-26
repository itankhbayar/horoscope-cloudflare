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
    const key = `${lang}:${sign}:${date ?? 'today'}`;
    if (cache.has(key)) {
      horoscope.value = cache.get(key)!;
      track('horoscope_viewed', { sign, date: date ?? 'today', source: 'memory_cache' });
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const data = await horoscopeService.fetchDailyHoroscope(sign, date);
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
