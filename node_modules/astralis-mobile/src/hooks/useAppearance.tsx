import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

export type AppearanceMode = 'light' | 'dark';

export type AppearancePalette = {
  background: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
};

const APPEARANCE_STORAGE_KEY = 'app:appearance-mode';

const DARK_PALETTE: AppearancePalette = {
  background: '#050510',
  surface: '#0f1024',
  card: '#15162e',
  border: 'rgba(139, 154, 255, 0.22)',
  text: '#e8e9f4',
  textMuted: '#9aa0c2',
  accent: '#8b6bff',
};

const LIGHT_PALETTE: AppearancePalette = {
  background: '#f4f5ff',
  surface: '#ffffff',
  card: '#f8f9ff',
  border: 'rgba(97, 109, 196, 0.22)',
  text: '#181b33',
  textMuted: '#59608b',
  accent: '#6b55e5',
};

type AppearanceContextValue = {
  mode: AppearanceMode;
  palette: AppearancePalette;
  hydrated: boolean;
  setMode: (mode: AppearanceMode) => Promise<void>;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyNativeAppearance(mode: AppearanceMode): void {
  const withSetter = Appearance as unknown as {
    setColorScheme?: (scheme: 'light' | 'dark' | null) => void;
  };
  if (typeof withSetter.setColorScheme === 'function') {
    withSetter.setColorScheme(mode);
  }
}

export function AppearanceProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [mode, setModeState] = useState<AppearanceMode>('dark');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (!active) return;
        const next: AppearanceMode = saved === 'light' ? 'light' : 'dark';
        setModeState(next);
        applyNativeAppearance(next);
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: AppearanceMode): Promise<void> => {
    setModeState(nextMode);
    applyNativeAppearance(nextMode);
    await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, nextMode);
  }, []);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      mode,
      palette: mode === 'light' ? LIGHT_PALETTE : DARK_PALETTE,
      hydrated,
      setMode,
    }),
    [hydrated, mode, setMode],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error('useAppearance must be used within AppearanceProvider.');
  }
  return ctx;
}
