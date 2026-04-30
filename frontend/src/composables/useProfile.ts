import { ref } from 'vue';
import { profileService } from '../lib';
import type { ProfilePayload } from '../lib/types';

export function useProfile() {
  const profile = ref<ProfilePayload | null>(null);
  const loading = ref(false);
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

  return { profile, loading, error, load, recompute };
}
