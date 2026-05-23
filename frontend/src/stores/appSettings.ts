import { ref } from 'vue';
import { defineStore } from 'pinia';
import { DEFAULT_LOCALE, persistLocale, type AppLocale } from '../i18n';
import { getStorage } from '../lib/storage';

const SETTINGS_KEY = 'astralis_app_settings_v1';

type ThemeMode = 'system' | 'dark';

interface PersistedAppSettings {
  locale: AppLocale;
  theme: ThemeMode;
  reducedMotion: boolean;
}

export const useAppSettingsStore = defineStore('appSettings', () => {
  const locale = ref<AppLocale>(DEFAULT_LOCALE);
  const theme = ref<ThemeMode>('system');
  const reducedMotion = ref(false);

  async function hydrate(initialLocale: AppLocale): Promise<void> {
    locale.value = initialLocale;
    const raw = await getStorage().getItem(SETTINGS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedAppSettings>;
      if (parsed.locale === 'en' || parsed.locale === 'mn') locale.value = parsed.locale;
      if (parsed.theme === 'system' || parsed.theme === 'dark') theme.value = parsed.theme;
      if (typeof parsed.reducedMotion === 'boolean') reducedMotion.value = parsed.reducedMotion;
    } catch {
      await getStorage().removeItem(SETTINGS_KEY);
    }
  }

  async function persist(): Promise<void> {
    await getStorage().setItem(
      SETTINGS_KEY,
      JSON.stringify({
        locale: locale.value,
        theme: theme.value,
        reducedMotion: reducedMotion.value,
      } satisfies PersistedAppSettings),
    );
  }

  async function setLocale(nextLocale: AppLocale): Promise<void> {
    locale.value = nextLocale;
    persistLocale(nextLocale);
    await persist();
  }

  async function setReducedMotion(nextValue: boolean): Promise<void> {
    reducedMotion.value = nextValue;
    await persist();
  }

  return {
    locale,
    theme,
    reducedMotion,
    hydrate,
    setLocale,
    setReducedMotion,
  };
});
