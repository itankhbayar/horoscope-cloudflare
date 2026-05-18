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
      <span class="flag">{{ flags[locale] }}</span>
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
          <span class="flag">{{ flags[code] }}</span>
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
  gap: 0.45rem;
  padding: 0.4rem 0.85rem;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.8rem;
  transition: all 0.3s ease;
}
.lang-trigger:hover {
  color: var(--gold-light);
  border-color: var(--glass-border-hover);
  background: rgba(255, 255, 255, 0.03);
}
.flag { font-size: 1rem; line-height: 1; }
.label { letter-spacing: 0.5px; }
.chevron {
  font-size: 0.75rem;
  transition: transform 0.25s ease;
  color: var(--text-muted);
}
.chevron.open { transform: rotate(-180deg); }
.lang-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0.3rem;
  min-width: 160px;
  background: rgba(20, 15, 40, 0.95);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  z-index: 50;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.lang-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--text-primary);
  transition: background 0.2s ease;
}
.lang-option:hover {
  background: var(--gold-glow);
  color: var(--gold-light);
}
.lang-option.active { color: var(--gold); }
.check {
  margin-left: auto;
  color: var(--gold);
  font-size: 0.8rem;
}
.lang-fade-enter-active, .lang-fade-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.lang-fade-enter-from, .lang-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
