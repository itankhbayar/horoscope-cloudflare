import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';

export function useAuth() {
  const store = useAuthStore();
  const { user, isAuthenticated, loading, error, initialized } = storeToRefs(store);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    initialized,
    bootstrap: store.bootstrap,
    login: store.login,
    register: store.register,
    logout: store.logout,
    deleteAccount: store.deleteAccount,
    exportMyData: store.exportMyData,
    refreshUser: store.refreshUser,
  };
}
