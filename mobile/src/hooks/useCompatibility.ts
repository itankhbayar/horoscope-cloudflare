import { useCallback, useState } from 'react';
import * as compatibilityService from '@astralis/lib/compatibilityService';
import type { CompatibilityResult, ZodiacSign } from '@astralis/lib/types';
import { track } from '../lib/analytics';

export function useCompatibility(): {
  result: CompatibilityResult | null;
  loading: boolean;
  error: string | null;
  compareSigns: (sign1: ZodiacSign, sign2: ZodiacSign) => Promise<void>;
  reset: () => void;
} {
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compareSigns = useCallback(async (sign1: ZodiacSign, sign2: ZodiacSign) => {
    setLoading(true);
    setError(null);
    try {
      const data = await compatibilityService.compareSigns(sign1, sign2);
      setResult(data);
      void track('compatibility_viewed', { mode: 'signs', sign1, sign2 });
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

  return { result, loading, error, compareSigns, reset };
}
