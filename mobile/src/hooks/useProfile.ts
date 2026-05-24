import { useCallback, useState } from 'react';
import * as profileService from '@astralis/lib/profileService';
import type { ProfilePayload } from '@astralis/lib/types';

export function useProfile(): {
  profile: ProfilePayload | null;
  loading: boolean;
  avatarUploading: boolean;
  error: string | null;
  load: () => Promise<void>;
  recompute: () => Promise<void>;
  save: (input: {
    fullName: string;
    birthDate: string;
    birthTime?: string | null;
    birthCity: string;
    birthCountry?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    timezoneOffset: number;
  }) => Promise<void>;
  uploadAvatar: (formData: FormData) => Promise<string>;
} {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
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
      birthDate: string;
      birthTime?: string | null;
      birthCity: string;
      birthCountry?: string | null;
      latitude?: number | null;
      longitude?: number | null;
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

  const uploadAvatar = useCallback(async (formData: FormData): Promise<string> => {
    setAvatarUploading(true);
    setError(null);
    try {
      const result = await profileService.uploadAvatar(formData);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                avatarUrl: result.avatarUrl,
              },
            }
          : prev,
      );
      return result.avatarUrl;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to upload avatar';
      setError(message);
      throw e;
    } finally {
      setAvatarUploading(false);
    }
  }, []);

  return { profile, loading, avatarUploading, error, load, recompute, save, uploadAvatar };
}
