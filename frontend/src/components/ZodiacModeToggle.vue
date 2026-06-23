<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useZodiacModeStore } from '../stores';
import { resolveModeNavigation, type ZodiacMode } from '../lib/zodiacModeRoutes';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const zodiacMode = useZodiacModeStore();

const options = computed<{ key: ZodiacMode; label: string; icon: string }[]>(() => [
  { key: 'western', label: t('zodiacMode.western'), icon: '☀' },
  { key: 'chinese', label: t('zodiacMode.chinese'), icon: '☯' },
]);

async function choose(next: ZodiacMode): Promise<void> {
  if (next === zodiacMode.mode) return;
  await zodiacMode.setMode(next);
  const dest = resolveModeNavigation(route.path, next);
  if (dest && dest !== route.path) await router.push(dest);
}
</script>

<template>
  <div class="zmode" role="group" :aria-label="t('zodiacMode.toggleLabel')">
    <button
      v-for="opt in options"
      :key="opt.key"
      type="button"
      class="zmode-btn"
      :class="{ active: opt.key === zodiacMode.mode }"
      :aria-pressed="opt.key === zodiacMode.mode"
      @click="choose(opt.key)"
    >
      <span class="zmode-icon" aria-hidden="true">{{ opt.icon }}</span>
      <span class="zmode-label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.zmode {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.18rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.zmode-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  min-height: 2rem;
  padding: 0 0.7rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.78rem;
  letter-spacing: 0.2px;
  transition: color 0.2s ease, background 0.2s ease;
}
.zmode-btn:hover {
  color: var(--gold-light);
}
.zmode-btn.active {
  color: #151326;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
  box-shadow: 0 6px 18px rgba(212, 175, 55, 0.18);
}
.zmode-btn:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
.zmode-icon {
  font-size: 0.9rem;
}
@media (max-width: 980px) {
  .zmode-label {
    display: none;
  }
  .zmode-btn {
    padding: 0 0.55rem;
  }
}
</style>
