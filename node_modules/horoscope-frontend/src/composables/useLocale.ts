import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  persistLocale,
  type AppLocale,
} from '../i18n';
import { setApiLocale } from '../lib/apiClient';

export function useLocale() {
  const { locale, t } = useI18n();

  const current = computed<AppLocale>(() => locale.value as AppLocale);

  function setLocale(next: AppLocale): void {
    locale.value = next;
    persistLocale(next);
    setApiLocale(next);
  }

  return {
    locale: current,
    setLocale,
    t,
    supported: SUPPORTED_LOCALES,
    labels: LOCALE_LABELS,
    flags: LOCALE_FLAGS,
  };
}
