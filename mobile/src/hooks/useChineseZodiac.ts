import { useCallback, useState } from 'react';
import * as chineseHoroscopeService from '@astralis/lib/chineseHoroscopeService';
import type {
  ChineseAnimal,
  ChineseProfile,
  PeriodType,
} from '@astralis/lib/types';

export type ChinesePeriod = 'daily' | PeriodType;

export interface ChineseReading {
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
}

export function useChineseZodiac(): {
  profile: ChineseProfile | null;
  reading: ChineseReading | null;
  loading: boolean;
  error: string | null;
  loadProfile: () => Promise<void>;
  loadReading: (animal: ChineseAnimal, period: ChinesePeriod) => Promise<void>;
} {
  const [profile, setProfile] = useState<ChineseProfile | null>(null);
  const [reading, setReading] = useState<ChineseReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await chineseHoroscopeService.fetchChineseProfile());
    } catch {
      // No birth profile / not signed in — the animal picker still works.
      setProfile(null);
    }
  }, []);

  const loadReading = useCallback(async (animal: ChineseAnimal, period: ChinesePeriod) => {
    setLoading(true);
    setError(null);
    try {
      const data = period === 'daily'
        ? await chineseHoroscopeService.fetchChineseDaily(animal)
        : await chineseHoroscopeService.fetchChinesePeriod(animal, period);
      setReading(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reading');
      setReading(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, reading, loading, error, loadProfile, loadReading };
}
