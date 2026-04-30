import { ref, computed } from 'vue';
import { authService } from '../lib';
import type { AuthUser, LoginPayload, RegisterPayload } from '../lib/types';

const user = ref<AuthUser | null>(null);
const loading = ref(false);
const initialized = ref(false);
const error = ref<string | null>(null);

async function bootstrap(): Promise<void> {
  if (initialized.value) return;
  loading.value = true;
  try {
    const cached = await authService.getCachedUser();
    if (cached && (await authService.isAuthenticated())) {
      user.value = cached;
      try {
        const fresh = await authService.fetchMe();
        user.value = fresh;
      } catch {
        await authService.logout();
        user.value = null;
      }
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
  } catch (err) {
    error.value = (err as Error).message;
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
  } catch (err) {
    error.value = (err as Error).message;
    throw err;
  } finally {
    loading.value = false;
  }
}

async function logout(): Promise<void> {
  await authService.logout();
  user.value = null;
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
  };
}
