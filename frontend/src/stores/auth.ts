import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { authService } from '../lib';
import type { AuthUser, LoginPayload, RegisterPayload } from '../lib/types';
import { identifyAnalyticsUser, track } from '../lib/analytics';
import { captureFrontendException } from '../lib/errorTracking';

const ME_TIMEOUT_MS = 8_000;

function timeoutAfter(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const loading = ref(false);
  const initialized = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  function setUser(nextUser: AuthUser | null): void {
    user.value = nextUser;
  }

  async function bootstrap(): Promise<void> {
    if (initialized.value) return;
    loading.value = true;
    try {
      const hasToken = await authService.isAuthenticated();
      const cached = await authService.getCachedUser();
      if (!hasToken) {
        user.value = null;
        return;
      }
      if (cached) user.value = cached;
      try {
        user.value = await Promise.race([
          authService.fetchMe(),
          timeoutAfter(ME_TIMEOUT_MS, 'me-timeout'),
        ]);
      } catch {
        await authService.clearLocalSession();
        user.value = null;
      }
    } finally {
      initialized.value = true;
      loading.value = false;
    }
  }

  async function login(payload: LoginPayload): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const result = await authService.login(payload);
      user.value = result.user;
      identifyAnalyticsUser(result.user.id);
      track('login');
    } catch (err) {
      error.value = (err as Error).message;
      captureFrontendException(err, { auth: { flow: 'login' } });
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function register(
    payload: RegisterPayload,
    analytics: { signupSource?: string | null; shareRef?: string | null } = {},
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const result = await authService.register(payload);
      user.value = result.user;
      identifyAnalyticsUser(result.user.id);
      track('signup_completed', {
        hasBirthProfile: true,
        signup_source: analytics.signupSource ?? null,
        share_ref: analytics.shareRef ?? null,
      });
    } catch (err) {
      error.value = (err as Error).message;
      captureFrontendException(err, { auth: { flow: 'register' } });
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    await authService.logout();
    user.value = null;
    identifyAnalyticsUser(null);
  }

  async function deleteAccount(): Promise<void> {
    await authService.deleteAccount();
    user.value = null;
    identifyAnalyticsUser(null);
  }

  async function exportMyData(): Promise<Record<string, unknown>> {
    return authService.exportMyData();
  }

  async function refreshUser(): Promise<void> {
    if (!(await authService.isAuthenticated())) {
      user.value = null;
      return;
    }
    user.value = await authService.refreshProfile();
  }

  async function validateGuestSession(): Promise<boolean> {
    if (!(await authService.isAuthenticated())) return false;
    try {
      await Promise.race([
        authService.fetchMe(),
        timeoutAfter(4_000, 'auth-check-timeout'),
      ]);
      return true;
    } catch {
      await authService.clearLocalSession();
      user.value = null;
      return false;
    }
  }

  return {
    user,
    loading,
    initialized,
    error,
    isAuthenticated,
    setUser,
    bootstrap,
    login,
    register,
    logout,
    deleteAccount,
    exportMyData,
    refreshUser,
    validateGuestSession,
  };
});
