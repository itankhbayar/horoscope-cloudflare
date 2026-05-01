import { ref, computed } from 'vue';
import { tarotService } from '../lib';
import type { TarotApiResponse, ZodiacSign } from '../lib/types';

export function useTarot() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const empty = ref(false);
  const data = ref<TarotApiResponse | null>(null);

  const hasReading = computed(() => data.value !== null);

  async function load(params: { sign: ZodiacSign; timezone: string; date?: string; lang?: string }): Promise<void> {
    loading.value = true;
    error.value = null;
    empty.value = false;
    data.value = null;
    try {
      const res = await tarotService.fetchTarotDaily(params);
      data.value = res;
      empty.value = false;
    } catch (e) {
      if (tarotService.isTarotNotFound(e)) {
        empty.value = true;
        error.value = null;
      } else {
        error.value = (e as Error).message ?? 'Request failed';
        empty.value = false;
      }
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    loading.value = false;
    error.value = null;
    empty.value = false;
    data.value = null;
  }

  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    empty: computed(() => empty.value),
    data: computed(() => data.value),
    hasReading,
    load,
    reset,
  };
}
