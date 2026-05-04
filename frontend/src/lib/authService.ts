import { apiRequest, setAuthToken, getAuthToken } from './apiClient';
import type { AuthResult, AuthUser, LoginPayload, RegisterPayload } from './types';

const USER_KEY = 'horoscope_user';

import { getStorage } from './storage';

export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const result = await apiRequest<AuthResult>('/api/auth/register', {
    method: 'POST',
    body: payload,
    timeoutMs: 45_000,
  });
  await setAuthToken(result.token);
  await getStorage().setItem(USER_KEY, JSON.stringify(result.user));
  return result;
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const result = await apiRequest<AuthResult>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
  await setAuthToken(result.token);
  await getStorage().setItem(USER_KEY, JSON.stringify(result.user));
  return result;
}

/** Clear token and cached user without calling the API (avoids hanging when the Worker is down). */
export async function clearLocalSession(): Promise<void> {
  await setAuthToken(null);
  await getStorage().removeItem(USER_KEY);
}

export async function logout(): Promise<void> {
  try {
    await Promise.race([
      apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST', auth: true }),
      new Promise<void>((resolve) => {
        setTimeout(resolve, 2500);
      }),
    ]);
  } catch {
    // ignore network errors on logout
  }
  await clearLocalSession();
}

export async function fetchMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/auth/me', { auth: true });
}

export async function persistCachedUser(user: AuthUser): Promise<void> {
  await getStorage().setItem(USER_KEY, JSON.stringify(user));
}

export async function refreshProfile(): Promise<AuthUser> {
  const user = await fetchMe();
  await persistCachedUser(user);
  return user;
}

export async function getCachedUser(): Promise<AuthUser | null> {
  const raw = await getStorage().getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getAuthToken()) !== null;
}
