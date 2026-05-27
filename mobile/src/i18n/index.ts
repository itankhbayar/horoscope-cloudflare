import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiLocale } from '@astralis/lib/apiClient';
import { en, type TranslationKey } from './locales/en';
import { mn } from './locales/mn';

export type AppLocale = 'mn' | 'en';
export type { TranslationKey };

export const MOBILE_LOCALE_STORAGE_KEY = 'astralis:mobile-locale:v1';
export const DEFAULT_LOCALE: AppLocale = 'mn';

const dictionaries: Record<AppLocale, Record<TranslationKey, string>> = { en, mn };
let activeLocale: AppLocale = DEFAULT_LOCALE;
setApiLocale(activeLocale);

type Params = Record<string, string | number | null | undefined>;

function interpolate(value: string, params?: Params): string {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, key) => {
    const replacement = params[key];
    return replacement === undefined || replacement === null ? match : String(replacement);
  });
}

export function normalizeLocale(value: unknown): AppLocale {
  return value === 'en' || value === 'mn' ? value : DEFAULT_LOCALE;
}

export function getCurrentLocale(): AppLocale {
  return activeLocale;
}

export function setLocaleForRuntime(locale: AppLocale): void {
  activeLocale = locale;
  setApiLocale(locale);
}

export function translate(key: TranslationKey, params?: Params, locale = activeLocale): string {
  const value = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  return interpolate(value, params);
}

export async function readSavedLocale(): Promise<AppLocale> {
  const raw = await AsyncStorage.getItem(MOBILE_LOCALE_STORAGE_KEY);
  return normalizeLocale(raw);
}

async function persistLocale(locale: AppLocale): Promise<void> {
  await AsyncStorage.setItem(MOBILE_LOCALE_STORAGE_KEY, locale);
}

type I18nContextValue = {
  locale: AppLocale;
  ready: boolean;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: TranslationKey, params?: Params) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [locale, setLocaleState] = useState<AppLocale>(activeLocale);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void readSavedLocale().then((saved) => {
      if (!alive) return;
      setLocaleForRuntime(saved);
      setLocaleState(saved);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setLocale = useCallback(async (next: AppLocale) => {
    setLocaleForRuntime(next);
    setLocaleState(next);
    await persistLocale(next);
  }, []);

  const t = useCallback((key: TranslationKey, params?: Params) => translate(key, params, locale), [locale]);

  const value = useMemo(() => ({ locale, ready, setLocale, t }), [locale, ready, setLocale, t]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used within I18nProvider');
  return value;
}

export function __setLocaleForTests(locale: AppLocale): void {
  setLocaleForRuntime(locale);
}
