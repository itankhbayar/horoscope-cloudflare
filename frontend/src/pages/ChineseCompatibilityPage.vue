<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { chineseCompatibilityService, CHINESE_ANIMAL_ORDER, getChineseAnimalInfo } from '../lib';
import type { ChineseAnimal, ChineseCompatibilityResult } from '../lib/types';
import { useAuth } from '../composables/useAuth';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import GuestResultGate from '../components/GuestResultGate.vue';
import AppContainer from '../components/layout/AppContainer.vue';

const { t, locale } = useI18n();
const { isAuthenticated } = useAuth();

const animal1 = ref<ChineseAnimal>('rat');
const animal2 = ref<ChineseAnimal>('dragon');
const result = ref<ChineseCompatibilityResult | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const showGuestGate = ref(false);

const animals = CHINESE_ANIMAL_ORDER;

function animalName(animal: ChineseAnimal): string {
  return t(`chineseZodiac.animals.${animal}`);
}
function animalEmoji(animal: ChineseAnimal): string {
  return getChineseAnimalInfo(animal).emoji;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#7bbf6a';
  if (score >= 60) return '#e8d48b';
  if (score >= 40) return '#ff8a5c';
  return '#ff6b6b';
}

const metrics = computed(() => {
  if (!result.value) return [];
  return [
    { label: t('chineseZodiac.love'), value: result.value.loveScore },
    { label: t('chineseZodiac.friendship'), value: result.value.friendshipScore },
    { label: t('chineseZodiac.communication'), value: result.value.communicationScore },
  ];
});

async function runCompare(): Promise<void> {
  if (!isAuthenticated.value) {
    showGuestGate.value = true;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    result.value = await chineseCompatibilityService.compareAnimals(animal1.value, animal2.value);
  } catch (err) {
    error.value = (err as Error).message;
    result.value = null;
  } finally {
    loading.value = false;
  }
}

watch(locale, () => {
  if (result.value) void runCompare();
});
</script>

<template>
  <AppContainer size="md">
    <section class="czc-page">
      <header class="czc-header">
        <h1 class="czc-title">{{ t('chineseZodiac.compatTitle') }}</h1>
        <p class="czc-subtitle">{{ t('chineseZodiac.compatSubtitle') }}</p>
      </header>

      <div class="glass-card czc-form">
        <div class="czc-pickers">
          <label class="czc-field">
            <span>{{ t('chineseZodiac.firstAnimal') }}</span>
            <select v-model="animal1">
              <option v-for="a in animals" :key="a" :value="a">{{ animalEmoji(a) }} {{ animalName(a) }}</option>
            </select>
          </label>
          <span class="czc-amp">☯</span>
          <label class="czc-field">
            <span>{{ t('chineseZodiac.secondAnimal') }}</span>
            <select v-model="animal2">
              <option v-for="a in animals" :key="a" :value="a">{{ animalEmoji(a) }} {{ animalName(a) }}</option>
            </select>
          </label>
        </div>
        <button class="btn-compact czc-compute" @click="runCompare">☯ {{ t('chineseZodiac.compute') }}</button>
      </div>

      <GuestResultGate v-if="showGuestGate" :message="t('chineseZodiac.guestCompatTitle')" />

      <LoadingSpinner v-else-if="loading" :label="t('chineseZodiac.aligning')" />

      <div v-else-if="result" class="glass-card czc-result">
        <div class="czc-pair">
          <span>{{ animalEmoji(result.animal1) }} {{ animalName(result.animal1) }}</span>
          <span class="czc-pair-amp">☯</span>
          <span>{{ animalEmoji(result.animal2) }} {{ animalName(result.animal2) }}</span>
        </div>

        <div class="czc-overall">
          <span class="czc-overall-label">{{ t('chineseZodiac.overallHarmony') }}</span>
          <span class="czc-overall-score" :style="{ color: scoreColor(result.overallScore) }">{{ result.overallScore }}%</span>
        </div>

        <div class="czc-metrics">
          <div v-for="m in metrics" :key="m.label" class="czc-metric">
            <div class="czc-metric-top">
              <span>{{ m.label }}</span>
              <span :style="{ color: scoreColor(m.value) }">{{ m.value }}%</span>
            </div>
            <div class="czc-bar"><div class="czc-bar-fill" :style="{ width: m.value + '%', background: scoreColor(m.value) }" /></div>
          </div>
        </div>

        <p class="czc-summary">{{ result.summary }}</p>

        <ul v-if="result.highlights.length" class="czc-highlights">
          <li v-for="(h, i) in result.highlights" :key="i">{{ h }}</li>
        </ul>
      </div>

      <p v-else-if="error" class="czc-error">{{ error }}</p>
    </section>
  </AppContainer>
</template>

<style scoped>
.czc-page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-top: 1.4rem;
}
.czc-header {
  text-align: center;
}
.czc-title {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  color: var(--text-primary);
  margin: 0 0 0.4rem;
}
.czc-subtitle {
  color: var(--text-secondary);
  margin: 0 auto;
  max-width: 38rem;
  line-height: 1.6;
  font-size: 0.95rem;
}
.czc-form {
  padding: 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.czc-pickers {
  display: flex;
  align-items: flex-end;
  gap: 0.8rem;
}
.czc-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.czc-field select {
  padding: 0.55rem 0.7rem;
  border-radius: 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  color-scheme: dark;
}
.czc-amp {
  font-size: 1.4rem;
  color: var(--gold);
  padding-bottom: 0.4rem;
}
.czc-compute {
  align-self: center;
}
.czc-result {
  padding: 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.czc-pair {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  font-family: var(--font-display);
  font-size: 1.2rem;
  color: var(--text-primary);
}
.czc-pair-amp {
  color: var(--gold);
}
.czc-overall {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}
.czc-overall-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}
.czc-overall-score {
  font-family: var(--font-display);
  font-size: 2.6rem;
  font-weight: 700;
}
.czc-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.czc-metric-top {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}
.czc-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.czc-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease;
}
.czc-summary {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
  text-align: center;
}
.czc-highlights {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.czc-error {
  text-align: center;
  color: var(--error);
}
</style>
