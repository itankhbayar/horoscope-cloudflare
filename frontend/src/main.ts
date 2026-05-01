import './assets/main.css';

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import i18n, { loadInitialLocale, persistLocale } from './i18n';
import { configureApi, setApiLocale } from './lib/apiClient';

const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const apiBase =
  fromEnv && fromEnv.length > 0
    ? fromEnv
    : import.meta.env.DEV
      ? 'http://127.0.0.1:8787'
      : 'http://127.0.0.1:8787';
configureApi({ baseUrl: apiBase });

const initialLocale = loadInitialLocale();
persistLocale(initialLocale);
setApiLocale(initialLocale);

createApp(App).use(router).use(i18n).mount('#app');
