<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { ZodiacInfo } from '../lib/types';
import { elementColor } from '../lib/zodiac';

const { t } = useI18n();

defineProps<{
  sign: ZodiacInfo;
  active?: boolean;
  compact?: boolean;
}>();

defineEmits<{
  (e: 'select', sign: ZodiacInfo): void;
}>();
</script>

<template>
  <button
    class="zodiac-card glass-card"
    :class="{ active, compact }"
    @click="$emit('select', sign)"
  >
    <span class="symbol" :style="{ color: elementColor(sign.element) }">{{ sign.symbol }}</span>
    <span class="name">{{ t(`zodiac.${sign.key}`) }}</span>
    <span v-if="!compact" class="meta">{{ t(`elements.${sign.element}`) }} · {{ t(`modalities.${sign.modality}`) }}</span>
  </button>
</template>

<style scoped>
.zodiac-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-color: transparent;
  background: rgba(15, 15, 40, 0.55);
}
.zodiac-card.compact { padding: 0.6rem 0.4rem; }
.zodiac-card:hover {
  border-color: var(--glass-border-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.3);
}
.zodiac-card.active {
  border-color: var(--gold);
  box-shadow: 0 0 25px var(--gold-glow);
}
.symbol { font-size: 1.7rem; line-height: 1; }
.zodiac-card.compact .symbol { font-size: 1.3rem; }
.name {
  font-family: var(--font-display);
  font-size: 0.95rem;
  color: var(--text-primary);
}
.meta {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>
