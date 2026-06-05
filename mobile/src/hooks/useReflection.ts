import { useCallback, useState } from 'react';
import * as horoscopeService from '@astralis/lib/horoscopeService';
import type { ReflectionState, ReflectionSubmitResult, Resonance } from '@astralis/lib/types';

/**
 * Accuracy Loop client state. `loadState` powers the morning acknowledgment block and
 * the evening check-in card; `submit` records tonight's resonance and optimistically
 * clears the pending nudge.
 */
export function useReflection(): {
  state: ReflectionState | null;
  loading: boolean;
  error: string | null;
  loadState: (date?: string) => Promise<void>;
  submit: (readingDate: string, resonance: Resonance) => Promise<ReflectionSubmitResult>;
} {
  const [state, setState] = useState<ReflectionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadState = useCallback(async (date?: string) => {
    setLoading(true);
    setError(null);
    try {
      const next = await horoscopeService.fetchReflectionState(date);
      setState(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reflection state');
    } finally {
      setLoading(false);
    }
  }, []);

  const submit = useCallback(async (readingDate: string, resonance: Resonance) => {
    const result = await horoscopeService.submitReflection(readingDate, resonance);
    setState((current) =>
      current
        ? {
            ...current,
            todayCheckIn: { readingDate: result.readingDate, resonance: result.resonance },
            checkInPending: false,
          }
        : current,
    );
    return result;
  }, []);

  return { state, loading, error, loadState, submit };
}
