<script setup lang="ts">
import { useLocale } from '../composables/useLocale';
import type { AppLocale } from '../i18n';

const { locale, setLocale, supported, labels } = useLocale();

function pick(next: AppLocale): void {
  if (next !== locale.value) setLocale(next);
}
</script>

<template>
  <div class="lang-toggle" role="group" aria-label="Language">
    <button
      v-for="code in supported"
      :key="code"
      type="button"
      class="lang-opt"
      :class="{ active: code === locale }"
      :aria-pressed="code === locale"
      :aria-label="labels[code]"
      :title="labels[code]"
      :lang="code"
      @click="pick(code)"
    >
      {{ code.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped>
.lang-toggle {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
/* Override the global 44px button floor so the toggle matches the nav pills. */
.lang-toggle .lang-opt {
  min-height: 1.95rem;
  padding: 0 0.62rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.6px;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}
.lang-toggle .lang-opt:hover {
  color: var(--gold-light);
}
.lang-toggle .lang-opt.active {
  color: #151326;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
  box-shadow: 0 6px 18px rgba(212, 175, 55, 0.18);
}
.lang-toggle .lang-opt:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
</style>
