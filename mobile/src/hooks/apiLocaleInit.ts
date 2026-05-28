import { setApiLocale } from '@astralis/lib/apiClient';
import { DEFAULT_LOCALE, readSavedLocale } from '../i18n';

export async function initializeApiLocaleFromPreferences(): Promise<void> {
  try {
    const saved = await readSavedLocale();
    setApiLocale(saved);
  } catch {
    setApiLocale(DEFAULT_LOCALE);
  }
}

