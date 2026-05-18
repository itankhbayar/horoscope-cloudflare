import { ref } from 'vue';
import { profileService } from '../lib';
import type { ProfilePayload } from '../lib/types';

export function useProfile() {
  const profile = ref<ProfilePayload | null>(null);
  const loading = ref(false);
  const avatarUploading = ref(false);
  const error = ref<string | null>(null);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      profile.value = await profileService.fetchProfile();
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function recompute(): Promise<void> {
    loading.value = true;
    try {
      profile.value = await profileService.recomputeNatalChart();
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function saveProfile(payload: {
    displayName: string;
    bio: string;
    timezone: string;
  }): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      profile.value = await profileService.updateProfile(payload);
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function uploadAvatar(file: File): Promise<string> {
    avatarUploading.value = true;
    error.value = null;
    try {
      const result = await profileService.uploadAvatar(file);
      if (profile.value) {
        profile.value = {
          ...profile.value,
          user: {
            ...profile.value.user,
            avatarUrl: result.avatarUrl,
          },
        };
      }
      return result.avatarUrl;
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      avatarUploading.value = false;
    }
  }

  return { profile, loading, avatarUploading, error, load, recompute, saveProfile, uploadAvatar };
}
