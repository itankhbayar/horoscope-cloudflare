import { ref } from 'vue';
import { compatibilityService } from '../lib';
import type { CompatibilityResult, ZodiacSign } from '../lib/types';

export function useCompatibility() {
  const result = ref<CompatibilityResult | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function compareSigns(sign1: ZodiacSign, sign2: ZodiacSign): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      result.value = await compatibilityService.compareSigns(sign1, sign2);
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    result.value = null;
    error.value = null;
  }

  return { result, loading, error, compareSigns, reset };
}
