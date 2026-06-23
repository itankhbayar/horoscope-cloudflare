<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { chineseHoroscopeService, CHINESE_ANIMAL_ORDER, getChineseAnimalInfo } from '../lib';
import type { ChineseAnimal, PeriodType } from '../lib/types';
import { useAuth } from '../composables/useAuth';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import AppContainer from '../components/layout/AppContainer.vue';

const { t, locale } = useI18n();
const { isAuthenticated } = useAuth();
const router = useRouter();

type Period = 'daily' | PeriodType;

interface Reading {
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
}

const selectedAnimal = ref<ChineseAnimal>('dragon');
const period = ref<Period>('daily');
const reading = ref<Reading | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const animals = CHINESE_ANIMAL_ORDER;
const periods: Period[] = ['daily', 'weekly', 'monthly', 'yearly'];

function animalName(animal: ChineseAnimal): string {
  return t(`chineseZodiac.animals.${animal}`);
}
function animalEmoji(animal: ChineseAnimal): string {
  return getChineseAnimalInfo(animal).emoji;
}

async function loadReading(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    reading.value = period.value === 'daily'
      ? await chineseHoroscopeService.fetchChineseDaily(selectedAnimal.value)
      : await chineseHoroscopeService.fetchChinesePeriod(selectedAnimal.value, period.value);
  } catch (err) {
    error.value = (err as Error).message;
    reading.value = null;
  } finally {
    loading.value = false;
  }
}

function selectAnimal(animal: ChineseAnimal): void {
  if (animal === selectedAnimal.value) return;
  selectedAnimal.value = animal;
  void loadReading();
}

function selectPeriod(next: Period): void {
  if (next === period.value) return;
  period.value = next;
  void loadReading();
}

onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      const profile = await chineseHoroscopeService.fetchChineseProfile();
      selectedAnimal.value = profile.animal;
    } catch {
      // No saved birth profile — keep the default and let the picker drive.
    }
  }
  await loadReading();
});

watch(locale, () => {
  void loadReading();
});
</script>

<template>
  <AppContainer size="md">
    <section class="cz-page">
      <header class="cz-header">
        <h1 class="cz-title">{{ t('chineseZodiac.dailyTitle') }}</h1>
        <p class="cz-subtitle">{{ t('chineseZodiac.dailySubtitle') }}</p>
      </header>

      <div class="cz-animals" role="tablist">
        <button
          v-for="animal in animals"
          :key="animal"
          class="cz-animal-chip"
          :class="{ active: animal === selectedAnimal }"
          @click="selectAnimal(animal)"
        >
          <span class="cz-animal-emoji">{{ animalEmoji(animal) }}</span>
          <span class="cz-animal-name">{{ animalName(animal) }}</span>
        </button>
      </div>

      <div class="cz-periods">
        <button
          v-for="p in periods"
          :key="p"
          class="cz-period"
          :class="{ active: p === period }"
          @click="selectPeriod(p)"
        >
          {{ t(`chineseZodiac.period${p.charAt(0).toUpperCase() + p.slice(1)}`) }}
        </button>
      </div>

      <LoadingSpinner v-if="loading" :label="t('chineseZodiac.loading')" />
      <div v-else-if="reading" class="cz-reading glass-card">
        <h3 class="cz-reading-animal">{{ animalEmoji(selectedAnimal) }} {{ animalName(selectedAnimal) }}</h3>
        <div class="cz-block">
          <h4>{{ t('chineseZodiac.overall') }}</h4>
          <p>{{ reading.overall }}</p>
        </div>
        <div class="cz-block">
          <h4>{{ t('chineseZodiac.love') }}</h4>
          <p>{{ reading.love }}</p>
        </div>
        <div class="cz-block">
          <h4>{{ t('chineseZodiac.career') }}</h4>
          <p>{{ reading.career }}</p>
        </div>
        <div class="cz-block">
          <h4>{{ t('chineseZodiac.health') }}</h4>
          <p>{{ reading.health }}</p>
        </div>
        <div class="cz-lucky">
          <span>{{ t('chineseZodiac.luckyNumber') }}: <strong>{{ reading.luckyNumber }}</strong></span>
          <span>{{ t('chineseZodiac.luckyColor') }}: <strong>{{ reading.luckyColor }}</strong></span>
        </div>
      </div>
      <p v-else-if="error" class="cz-error">{{ error }}</p>

      <button class="cz-compat-link" @click="router.push('/chinese/compatibility')">
        ☯ {{ t('chineseZodiac.openCompatibility') }}
      </button>
    </section>
  </AppContainer>
</template>

<style scoped>
.cz-page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-top: 1.4rem;
}
.cz-header {
  text-align: center;
}
.cz-title {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  color: var(--text-primary);
  margin: 0 0 0.4rem;
}
.cz-subtitle {
  color: var(--text-secondary);
  margin: 0 auto;
  max-width: 38rem;
  line-height: 1.6;
  font-size: 0.95rem;
}
.cz-animals {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.2rem, 1fr));
  gap: 0.5rem;
}
.cz-animal-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.6rem 0.3rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.cz-animal-chip:hover {
  background: rgba(212, 175, 55, 0.07);
}
.cz-animal-chip.active {
  border-color: var(--gold);
  background: rgba(212, 175, 55, 0.12);
  color: var(--gold-light);
}
.cz-animal-emoji {
  font-size: 1.5rem;
}
.cz-animal-name {
  font-size: 0.74rem;
}
.cz-periods {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  flex-wrap: wrap;
}
.cz-period {
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.84rem;
}
.cz-period.active {
  color: #151326;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
}
.cz-reading {
  padding: 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cz-reading-animal {
  margin: 0;
  font-family: var(--font-display);
  color: var(--text-primary);
}
.cz-block h4 {
  margin: 0 0 0.3rem;
  color: var(--gold-light);
  font-size: 0.95rem;
}
.cz-block p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-line;
}
.cz-lucky {
  display: flex;
  gap: 1.2rem;
  flex-wrap: wrap;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.cz-lucky strong {
  color: var(--gold-light);
}
.cz-error {
  text-align: center;
  color: var(--error);
}
.cz-compat-link {
  align-self: center;
  margin-top: 0.4rem;
  padding: 0.6rem 1.4rem;
  border-radius: 999px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  background: rgba(212, 175, 55, 0.08);
  color: var(--gold-light);
  cursor: pointer;
  font-size: 0.9rem;
}
</style>
