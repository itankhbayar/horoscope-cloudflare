import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Western vs Eastern (lunar/animal) zodiac system. Modeled on the i18n locale
 * preference (see ../i18n): a persisted, app-wide setting toggled like language,
 * NOT a navigation change. Screens read `mode` and swap their content.
 */
export type ZodiacMode = 'western' | 'eastern';

export const ZODIAC_MODE_STORAGE_KEY = 'astralis:mobile-zodiac-mode:v1';
export const DEFAULT_ZODIAC_MODE: ZodiacMode = 'western';

export function normalizeZodiacMode(value: unknown): ZodiacMode {
  return value === 'western' || value === 'eastern' ? value : DEFAULT_ZODIAC_MODE;
}

export async function readSavedZodiacMode(): Promise<ZodiacMode> {
  const raw = await AsyncStorage.getItem(ZODIAC_MODE_STORAGE_KEY);
  return normalizeZodiacMode(raw);
}

async function persistZodiacMode(mode: ZodiacMode): Promise<void> {
  await AsyncStorage.setItem(ZODIAC_MODE_STORAGE_KEY, mode);
}

type ZodiacModeContextValue = {
  mode: ZodiacMode;
  ready: boolean;
  setMode: (mode: ZodiacMode) => Promise<void>;
  toggle: () => Promise<void>;
};

const ZodiacModeContext = createContext<ZodiacModeContextValue | null>(null);

export function ZodiacModeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [mode, setModeState] = useState<ZodiacMode>(DEFAULT_ZODIAC_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void readSavedZodiacMode().then((saved) => {
      if (!alive) return;
      setModeState(saved);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback(async (next: ZodiacMode) => {
    setModeState(next);
    await persistZodiacMode(next);
  }, []);

  const toggle = useCallback(async () => {
    setModeState((current) => {
      const next: ZodiacMode = current === 'western' ? 'eastern' : 'western';
      void persistZodiacMode(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, ready, setMode, toggle }), [mode, ready, setMode, toggle]);

  return React.createElement(ZodiacModeContext.Provider, { value }, children);
}

export function useZodiacMode(): ZodiacModeContextValue {
  const value = useContext(ZodiacModeContext);
  if (!value) throw new Error('useZodiacMode must be used within ZodiacModeProvider');
  return value;
}
