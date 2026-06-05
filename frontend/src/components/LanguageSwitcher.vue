<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useLocale } from '../composables/useLocale';
import type { AppLocale } from '../i18n';

const { locale, setLocale, supported, labels, flags } = useLocale();
const open = ref(false);
const root = ref<HTMLElement | null>(null);

function toggle(): void {
  open.value = !open.value;
}

function pick(next: AppLocale): void {
  setLocale(next);
  open.value = false;
}

function handleOutside(e: MouseEvent): void {
  if (!root.value) return;
  if (!root.value.contains(e.target as Node)) open.value = false;
}

onMounted(() => document.addEventListener('click', handleOutside));
onBeforeUnmount(() => document.removeEventListener('click', handleOutside));
</script>

<template>
  <div ref="root" class="lang-switcher">
    <button class="lang-trigger" @click="toggle" :aria-expanded="open">
      <span class="flag" :class="{ 'flag-code': flags[locale].length <= 3 }">{{ flags[locale] }}</span>
      <span class="label">{{ labels[locale] }}</span>
      <span class="chevron" :class="{ open }">▾</span>
    </button>
    <transition name="lang-fade">
      <ul v-if="open" class="lang-menu">
        <li
          v-for="code in supported"
          :key="code"
          class="lang-option"
          :class="{ active: code === locale }"
          @click="pick(code)"
        >
          <span class="flag" :class="{ 'flag-code': flags[code].length <= 3 }">{{ flags[code] }}</span>
          <span class="label">{{ labels[code] }}</span>
          <span v-if="code === locale" class="check">✓</span>
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.lang-switcher { position: relative; display: inline-flex; }
.lang-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.25rem;
  padding: 0 0.72rem;
  background: rgba(255, 255, 255, 0.035);
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.8rem;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}
.lang-trigger:hover {
  color: var(--gold-light);
  border-color: rgba(212, 175, 55, 0.3);
  background: rgba(212, 175, 55, 0.07);
}
.lang-trigger:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}
.flag { font-size: 1rem; line-height: 1; }
.flag-code {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.4px;
}
.label { letter-spacing: 0.3px; }
.chevron {
  font-size: 0.7rem;
  transition: transform 0.25s ease;
  color: var(--text-muted);
}
.chevron.open { transform: rotate(-180deg); }
.lang-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0.35rem;
  min-width: 168px;
  background: rgba(8, 8, 24, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  z-index: 60;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
}
.lang-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  border-radius: 0.7rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition:
    color 0.2s ease,
    background 0.2s ease;
}
.lang-option:hover {
  background: rgba(212, 175, 55, 0.08);
  color: var(--gold-light);
}
.lang-option.active {
  color: #151326;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
}
.check {
  margin-left: auto;
  color: currentColor;
  font-size: 0.8rem;
}
.lang-fade-enter-active, .lang-fade-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.lang-fade-enter-from, .lang-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
