import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const enableVueDevTools = process.env.VITE_ENABLE_VUE_DEVTOOLS === 'true'
const devApiProxyTarget =
  process.env.VITE_DEV_API_PROXY?.replace(/\/$/, '') ?? 'http://127.0.0.1:8787'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': { target: devApiProxyTarget, changeOrigin: true },
    },
  },
  plugins: [
    vue(),
    ...(enableVueDevTools ? [vueDevTools()] : []),
  ],
  build: {
    assetsInlineLimit: 2048,
    cssCodeSplit: true,
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('vue-router') || id.includes('pinia') || id.includes('vue-i18n')) {
            return 'vue-platform';
          }
          if (id.includes('@sentry')) return 'sentry';
          if (id.includes('posthog-js')) return 'posthog';
          if (id.includes('vue')) return 'vue';
          return 'vendor';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
