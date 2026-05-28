import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { setStorage } from '@astralis/lib/storage';
import { configureApi } from '@astralis/lib/apiClient';
import * as authService from '@astralis/lib/authService';
import type { AuthUser, LoginPayload, RegisterPayload } from '@astralis/lib/types';
import { asyncStorageAdapter } from '../lib/storageAdapter';
import { configureRevenueCat, logOutRevenueCat } from '../lib/revenueCat/revenueCatService';
import { isRevenueCatConfigured } from '../lib/revenueCat/config';
import { initializeApiLocaleFromPreferences } from './apiLocaleInit';

const ME_TIMEOUT_MS = 8000;

type AuthCtx = {
  user: AuthUser | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setStorage(asyncStorageAdapter);
      const g = globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
      };
      const raw = typeof g.process?.env?.EXPO_PUBLIC_API_BASE_URL === 'string'
        ? g.process.env.EXPO_PUBLIC_API_BASE_URL.trim()
        : '';
      configureApi({
        baseUrl: raw.length > 0 ? raw : 'http://127.0.0.1:8787',
      });
      await initializeApiLocaleFromPreferences();

      try {
        const hasToken = await authService.isAuthenticated();
        const cached = await authService.getCachedUser();
        if (!alive) return;
        if (!hasToken) {
          setUser(null);
        } else {
          if (cached) setUser(cached);
          try {
            const me = await Promise.race([
              authService.fetchMe(),
              new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('me-timeout')), ME_TIMEOUT_MS);
              }),
            ]);
            if (alive) {
              setUser(me);
              if (isRevenueCatConfigured()) {
                await configureRevenueCat(me.id);
              }
            }
          } catch {
            await authService.clearLocalSession();
            if (alive) setUser(null);
          }
        }
      } finally {
        if (alive) {
          setInitialized(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.login(payload);
      setUser(result.user);
      if (isRevenueCatConfigured()) {
        await configureRevenueCat(result.user.id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.register(payload);
      setUser(result.user);
      if (isRevenueCatConfigured()) {
        await configureRevenueCat(result.user.id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Register failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    if (isRevenueCatConfigured()) {
      await logOutRevenueCat();
    }
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    if (isRevenueCatConfigured()) {
      await logOutRevenueCat();
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!(await authService.isAuthenticated())) {
      setUser(null);
      return;
    }
    const next = await authService.refreshProfile();
    setUser(next);
  }, []);

  const value = useMemo(
    (): AuthCtx => ({
      user,
      initialized,
      loading,
      error,
      login,
      register,
      logout,
      deleteAccount,
      refreshUser,
    }),
    [user, initialized, loading, error, login, register, logout, deleteAccount, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
