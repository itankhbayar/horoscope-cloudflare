import { ref } from 'vue';
import { defineStore } from 'pinia';
import { profileService } from '../lib';
import type { ProfilePayload } from '../lib/types';
import { useAuthStore } from './auth';

export const useUserProfileStore = defineStore('userProfile', () => {
  const profile = ref<ProfilePayload | null>(null);
  const loading = ref(false);
  const avatarUploading = ref(false);
  const error = ref<string | null>(null);

  function syncAuthUser(nextProfile: ProfilePayload): void {
    useAuthStore().setUser(nextProfile.user);
  }

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      profile.value = await profileService.fetchProfile();
      syncAuthUser(profile.value);
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function recompute(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      profile.value = await profileService.recomputeNatalChart();
      syncAuthUser(profile.value);
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
      syncAuthUser(profile.value);
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
        syncAuthUser(profile.value);
      }
      return result.avatarUrl;
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      avatarUploading.value = false;
    }
  }

  function clear(): void {
    profile.value = null;
    error.value = null;
  }

  return {
    profile,
    loading,
    avatarUploading,
    error,
    load,
    recompute,
    saveProfile,
    uploadAvatar,
    clear,
  };
});
