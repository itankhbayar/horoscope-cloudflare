import { storeToRefs } from 'pinia';
import { useUserProfileStore } from '../stores/userProfile';

export function useProfile() {
  const store = useUserProfileStore();
  const { profile, loading, avatarUploading, error } = storeToRefs(store);

  return {
    profile,
    loading,
    avatarUploading,
    error,
    load: store.load,
    recompute: store.recompute,
    saveProfile: store.saveProfile,
    uploadAvatar: store.uploadAvatar,
  };
}
