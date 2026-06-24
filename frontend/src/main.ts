import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import i18n, { loadInitialLocale, persistLocale } from './i18n';
import { configureApi, setApiLocale } from './lib/apiClient';
import { initAnalytics, track } from './lib/analytics';
import { initErrorTracking } from './lib/errorTracking';
import { hasAnalyticsConsent } from './lib/privacyConsent';
import { useAppSettingsStore, useZodiacModeStore } from './stores';

const fromEnv = (
  import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL
)?.trim();
/** In dev, empty base = same origin so Vite proxies `/api` → Worker (see vite.config.ts). */
const apiBase =
  fromEnv && fromEnv.length > 0
    ? fromEnv
    : import.meta.env.DEV
      ? ''
      : typeof window !== 'undefined'
        ? window.location.origin
        : '';
configureApi({ baseUrl: apiBase });

const initialLocale = loadInitialLocale();
persistLocale(initialLocale);
setApiLocale(initialLocale);

if (hasAnalyticsConsent()) initAnalytics();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia).use(router).use(i18n);
void useAppSettingsStore().hydrate(initialLocale);
initErrorTracking(app, router);

// Hydrate the persisted zodiac mode *before* mounting so the initial `/` redirect and the
// navbar resolve in the saved mode instead of flashing Western and snapping over once the
// async storage read lands. Mount unconditionally even if the read fails.
void useZodiacModeStore()
  .hydrate()
  .finally(() => {
    app.mount('#app');
    track('app_open', { locale: initialLocale });
  });
