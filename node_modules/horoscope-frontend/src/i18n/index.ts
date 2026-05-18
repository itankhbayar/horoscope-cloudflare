import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import mn from './locales/mn.json';

export const SUPPORTED_LOCALES = ['en', 'mn'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'mn';
export const LOCALE_STORAGE_KEY = 'horoscope_locale';

function isSupportedLocale(value: string | null): value is AppLocale {
  return value !== null && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function loadInitialLocale(): AppLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isSupportedLocale(saved)) return saved;
  return DEFAULT_LOCALE;
}

export function persistLocale(locale: AppLocale): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.documentElement.setAttribute('lang', locale);
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: loadInitialLocale(),
  fallbackLocale: 'en',
  messages: { en, mn },
});

export default i18n;

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  mn: 'Монгол',
};

export const LOCALE_FLAGS: Record<AppLocale, string> = {
  en: '🇬🇧',
  mn: '🇲🇳',
};
