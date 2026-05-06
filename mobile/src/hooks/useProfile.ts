import { useCallback, useState } from 'react';
import * as profileService from '@astralis/lib/profileService';
import type { ProfilePayload } from '@astralis/lib/types';

export function useProfile(): {
  profile: ProfilePayload | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  recompute: () => Promise<void>;
  save: (input: {
    fullName: string;
    zodiacSign: string;
    birthDate: string;
    timezoneOffset: number;
  }) => Promise<void>;
} {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await profileService.fetchProfile();
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const recompute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await profileService.recomputeNatalChart();
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to recompute chart');
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(
    async (input: {
      fullName: string;
      zodiacSign: string;
      birthDate: string;
      timezoneOffset: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await profileService.updateProfile(input);
        setProfile(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save profile');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { profile, loading, error, load, recompute, save };
}
