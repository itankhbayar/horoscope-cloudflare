<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { PlanetPosition } from '../lib/types';
import { getZodiacInfo, planetSymbol } from '../lib/zodiac';

const { t } = useI18n();

defineProps<{
  planets: PlanetPosition[];
}>();
</script>

<template>
  <div class="planet-table-wrap mobile-scroll-x">
    <div class="planet-table">
    <div class="header-row">
      <span>{{ t('planets.table.planet') }}</span>
      <span>{{ t('planets.table.sign') }}</span>
      <span>{{ t('planets.table.degree') }}</span>
      <span>{{ t('planets.table.house') }}</span>
      <span>{{ t('planets.table.status') }}</span>
    </div>
    <div v-for="planet in planets" :key="planet.name" class="row">
      <span class="planet">
        <span class="planet-symbol">{{ planetSymbol(planet.name) }}</span>
        {{ t(`planets.${planet.name}`) }}
      </span>
      <span class="sign">
        <span class="sign-symbol">{{ getZodiacInfo(planet.sign).symbol }}</span>
        {{ t(`zodiac.${planet.sign}`) }}
      </span>
      <span class="cell" :data-label="t('planets.table.degree')">{{ planet.degreeInSign.toFixed(2) }}°</span>
      <span class="cell" :data-label="t('planets.table.house')">{{ planet.house ? `${planet.house}` : '—' }}</span>
      <span class="cell" :data-label="t('planets.table.status')" :class="{ retrograde: planet.retrograde }">
        {{ planet.retrograde ? t('planets.table.retrograde') : t('planets.table.direct') }}
      </span>
    </div>
    </div>
  </div>
</template>

<style scoped>
.planet-table-wrap {
  width: 100%;
}
.planet-table {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  min-width: 560px;
}
.header-row, .row {
  display: grid;
  grid-template-columns: 1.4fr 1.4fr 1fr 0.8fr 1.1fr;
  align-items: center;
  padding: 0.7rem 0.4rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: var(--text-secondary);
}
.header-row {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--glass-border);
}
.row:last-child { border-bottom: none; }
.row:hover { background: rgba(201,168,76,0.04); }
.planet, .sign {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
}
.planet-symbol, .sign-symbol {
  color: var(--gold);
  font-size: 1.1rem;
}
.retrograde { color: #ff8a5c; font-style: italic; }

/* Phones: a 5-column table can't fit, so drop the horizontal scroll and stack
   each planet into a labeled two-column card. */
@media (max-width: 600px) {
  .planet-table-wrap {
    overflow-x: visible;
  }
  .planet-table {
    min-width: 0;
    gap: 0.55rem;
  }
  .header-row {
    display: none;
  }
  .row {
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem 0.8rem;
    padding: 0.85rem 0.9rem;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.02);
  }
  .row:last-child { border-bottom: 1px solid var(--glass-border); }
  .row .planet,
  .row .sign {
    font-size: 0.95rem;
    font-weight: 600;
  }
  .cell {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.86rem;
  }
  .cell::before {
    content: attr(data-label);
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
  }
}
</style>
