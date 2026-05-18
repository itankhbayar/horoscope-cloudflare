import './assets/main.css';

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import i18n, { loadInitialLocale, persistLocale } from './i18n';
import { configureApi, setApiLocale } from './lib/apiClient';

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

createApp(App).use(router).use(i18n).mount('#app');
