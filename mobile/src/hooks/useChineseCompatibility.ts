import { useCallback, useState } from 'react';
import * as chineseCompatibilityService from '@astralis/lib/chineseCompatibilityService';
import type { ChineseAnimal, ChineseCompatibilityResult } from '@astralis/lib/types';

export function useChineseCompatibility(): {
  result: ChineseCompatibilityResult | null;
  loading: boolean;
  error: string | null;
  compareAnimals: (animal1: ChineseAnimal, animal2: ChineseAnimal) => Promise<void>;
  reset: () => void;
} {
  const [result, setResult] = useState<ChineseCompatibilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compareAnimals = useCallback(async (animal1: ChineseAnimal, animal2: ChineseAnimal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await chineseCompatibilityService.compareAnimals(animal1, animal2);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compatibility failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, compareAnimals, reset };
}
