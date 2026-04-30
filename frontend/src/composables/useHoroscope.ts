import { ref } from 'vue';
import { horoscopeService } from '../lib';
import { getApiLocale } from '../lib/apiClient';
import type { DailyHoroscope, ZodiacSign } from '../lib/types';

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
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const data = await horoscopeService.fetchDailyHoroscope(sign, date);
      cache.set(key, data);
      horoscope.value = data;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function loadMine(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      horoscope.value = await horoscopeService.fetchMyDailyHoroscope();
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    horoscope.value = null;
    error.value = null;
  }

  return { horoscope, loading, error, load, loadMine, reset };
}
