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
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
