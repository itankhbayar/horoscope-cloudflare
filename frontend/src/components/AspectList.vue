<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { Aspect } from '../lib/types';
import { aspectSymbol, planetSymbol } from '../lib/zodiac';

const { t } = useI18n();

defineProps<{ aspects: Aspect[] }>();

const aspectColor = (type: string): string => {
  switch (type) {
    case 'conjunction': return '#e8d48b';
    case 'trine': return '#7bbf6a';
    case 'sextile': return '#9ec6ff';
    case 'square': return '#ff8a5c';
    case 'opposition': return '#ff6b6b';
    default: return '#c9a84c';
  }
};
</script>

<template>
  <div class="aspect-list">
    <div v-for="(aspect, i) in aspects" :key="i" class="aspect-row">
      <span class="planets">
        <span>{{ planetSymbol(aspect.body1) }}</span>
        <span class="aspect-symbol" :style="{ color: aspectColor(aspect.type) }">{{ aspectSymbol(aspect.type) }}</span>
        <span>{{ planetSymbol(aspect.body2) }}</span>
      </span>
      <span class="text">
        {{ t(`planets.${aspect.body1}`) }} {{ t(`aspects.types.${aspect.type}`) }} {{ t(`planets.${aspect.body2}`) }}
      </span>
      <span class="orb">{{ t('aspects.orb') }} {{ aspect.orb.toFixed(1) }}°</span>
    </div>
    <p v-if="aspects.length === 0" class="empty">{{ t('aspects.noAspects') }}</p>
  </div>
</template>

<style scoped>
.aspect-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.aspect-row {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  align-items: center;
  gap: 0.8rem;
  padding: 0.55rem 0.8rem;
  background: rgba(255,255,255,0.02);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255,255,255,0.04);
  font-size: 0.85rem;
}
.planets {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1.1rem;
  color: var(--gold);
}
.aspect-symbol { font-size: 1rem; }
.text { color: var(--text-secondary); }
.orb { color: var(--text-muted); font-size: 0.75rem; }
.empty { color: var(--text-muted); font-style: italic; padding: 1rem; text-align: center; }
</style>
