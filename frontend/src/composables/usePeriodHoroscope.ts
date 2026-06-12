import { ref } from 'vue';
import { horoscopeService } from '../lib';
import { getApiLocale } from '../lib/apiClient';
import type { PeriodHoroscope, PeriodType, ZodiacSign } from '../lib/types';
import { captureFrontendException } from '../lib/errorTracking';

const cache = new Map<string, PeriodHoroscope>();

/** Loads monthly/yearly readings from the period endpoints, mirroring useHoroscope. */
export function usePeriodHoroscope() {
  const reading = ref<PeriodHoroscope | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(sign: ZodiacSign, periodType: PeriodType): Promise<void> {
    const lang = getApiLocale();
    const key = `${lang}:${periodType}:${sign}`;
    if (cache.has(key)) {
      reading.value = cache.get(key)!;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const data = await horoscopeService.fetchPeriodHoroscope(sign, periodType);
      cache.set(key, data);
      reading.value = data;
    } catch (err) {
      error.value = (err as Error).message;
      captureFrontendException(err, { feature: { name: 'period_horoscope', sign } });
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    reading.value = null;
    error.value = null;
  }

  return { reading, loading, error, load, reset };
}
