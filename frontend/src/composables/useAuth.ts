import { ref, computed } from 'vue';
import { authService } from '../lib';
import type { AuthUser, LoginPayload, RegisterPayload } from '../lib/types';
import { identifyAnalyticsUser, track } from '../lib/analytics';
import { captureFrontendException } from '../lib/errorTracking';

const user = ref<AuthUser | null>(null);
const loading = ref(false);
const initialized = ref(false);
const error = ref<string | null>(null);

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
    if (cached) {
      user.value = cached;
    }
    const ME_TIMEOUT_MS = 8000;
    try {
      user.value = await Promise.race([
        authService.fetchMe(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('me-timeout')), ME_TIMEOUT_MS);
        }),
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

async function register(payload: RegisterPayload): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const result = await authService.register(payload);
    user.value = result.user;
    identifyAnalyticsUser(result.user.id);
    track('signup_completed');
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
}

async function exportMyData(): Promise<Record<string, unknown>> {
  return authService.exportMyData();
}

async function refreshUser(): Promise<void> {
  if (!(await authService.isAuthenticated())) {
    user.value = null;
    return;
  }
  const next = await authService.refreshProfile();
  user.value = next;
}

export function useAuth() {
  return {
    user: computed(() => user.value),
    isAuthenticated: computed(() => user.value !== null),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    initialized: computed(() => initialized.value),
    bootstrap,
    login,
    register,
    logout,
    deleteAccount,
    exportMyData,
    refreshUser,
  };
}
