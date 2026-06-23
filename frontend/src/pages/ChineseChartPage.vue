<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { chineseHoroscopeService, CHINESE_ANIMAL_ORDER, getChineseAnimalInfo, chineseElementColor } from '../lib';
import type { ChineseAnimal, ChineseProfile } from '../lib/types';
import { useAuth } from '../composables/useAuth';
import AppContainer from '../components/layout/AppContainer.vue';

const { t } = useI18n();
const { isAuthenticated } = useAuth();
const router = useRouter();

const selectedAnimal = ref<ChineseAnimal>('dragon');
const profile = ref<ChineseProfile | null>(null);
const birthDate = ref('');
const error = ref<string | null>(null);

const animals = CHINESE_ANIMAL_ORDER;

function animalName(animal: ChineseAnimal): string {
  return t(`chineseZodiac.animals.${animal}`);
}
function animalEmoji(animal: ChineseAnimal): string {
  return getChineseAnimalInfo(animal).emoji;
}

const info = computed(() => getChineseAnimalInfo(selectedAnimal.value));
const accent = computed(() =>
  chineseElementColor(
    profile.value && profile.value.animal === selectedAnimal.value
      ? profile.value.element
      : info.value.fixedElement,
  ),
);
const showsYearDetails = computed(
  () => profile.value !== null && profile.value.animal === selectedAnimal.value,
);

function selectAnimal(animal: ChineseAnimal): void {
  selectedAnimal.value = animal;
}

async function revealFromBirthDate(): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.value)) return;
  try {
    profile.value = await chineseHoroscopeService.fetchChineseProfilePreview(birthDate.value);
    selectedAnimal.value = profile.value.animal;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      profile.value = await chineseHoroscopeService.fetchChineseProfile();
      selectedAnimal.value = profile.value.animal;
    } catch {
      profile.value = null;
    }
  }
});
</script>

<template>
  <AppContainer size="md">
    <section class="cc-page">
      <header class="cc-header">
        <h1 class="cc-title">{{ t('chineseZodiac.chartTitle') }}</h1>
        <p class="cc-subtitle">{{ t('chineseZodiac.chartSubtitle') }}</p>
      </header>

      <div v-if="!profile" class="glass-card cc-birthdate">
        <p class="cc-hint">{{ t('chineseZodiac.guestProfileHint') }}</p>
        <div class="cc-birthdate-row">
          <label class="cc-field">
            <span>{{ t('chineseZodiac.birthDate') }}</span>
            <input v-model="birthDate" type="date" />
          </label>
          <button class="btn-celestial" @click="revealFromBirthDate">{{ t('chineseZodiac.reveal') }}</button>
        </div>
        <p v-if="error" class="cc-error">{{ error }}</p>
      </div>

      <div class="cc-animals" role="tablist">
        <button
          v-for="animal in animals"
          :key="animal"
          class="cc-animal-chip"
          :class="{ active: animal === selectedAnimal }"
          @click="selectAnimal(animal)"
        >
          <span class="cc-animal-emoji">{{ animalEmoji(animal) }}</span>
          <span class="cc-animal-name">{{ animalName(animal) }}</span>
        </button>
      </div>

      <div class="glass-card cc-chart" :style="{ '--cc-accent': accent }">
        <div class="cc-chart-head">
          <div class="cc-chart-emoji">{{ animalEmoji(selectedAnimal) }}</div>
          <div>
            <p class="cc-chart-label">{{ t('chineseZodiac.yourSign') }}</p>
            <h2 class="cc-chart-name">{{ animalName(selectedAnimal) }}</h2>
            <p v-if="showsYearDetails && profile" class="cc-chart-born">
              {{ t('chineseZodiac.born', { animal: animalName(selectedAnimal) }) }} · {{ profile.zodiacYear }}
            </p>
          </div>
        </div>

        <div class="cc-attrs">
          <span v-if="showsYearDetails && profile" class="cc-attr">
            {{ t('chineseZodiac.element') }}: {{ t(`chineseZodiac.elements.${profile.element}`) }}
          </span>
          <span class="cc-attr">
            {{ t('chineseZodiac.fixedElement') }}: {{ t(`chineseZodiac.elements.${info.fixedElement}`) }}
          </span>
          <span class="cc-attr">
            {{ t('chineseZodiac.polarity') }}:
            {{ info.yinYang === 'yang' ? t('chineseZodiac.yang') : t('chineseZodiac.yin') }}
          </span>
          <span class="cc-attr">{{ t('chineseZodiac.trineGroup') }}: {{ info.trineGroup }}</span>
          <span class="cc-attr">
            {{ t('chineseZodiac.secretFriend') }}: {{ animalEmoji(info.secretFriend) }} {{ animalName(info.secretFriend) }}
          </span>
          <span class="cc-attr">
            {{ t('chineseZodiac.conflictAnimal') }}: {{ animalEmoji(info.conflictAnimal) }} {{ animalName(info.conflictAnimal) }}
          </span>
          <span class="cc-attr">{{ t('chineseZodiac.luckyNumbers') }}: {{ info.luckyNumbers.join(', ') }}</span>
        </div>
      </div>

      <button class="cc-compat-link" @click="router.push('/chinese/compatibility')">
        ☯ {{ t('chineseZodiac.openCompatibility') }}
      </button>
    </section>
  </AppContainer>
</template>

<style scoped>
.cc-page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-top: 1.4rem;
}
.cc-header {
  text-align: center;
}
.cc-title {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  color: var(--text-primary);
  margin: 0 0 0.4rem;
}
.cc-subtitle {
  color: var(--text-secondary);
  margin: 0 auto;
  max-width: 38rem;
  line-height: 1.6;
  font-size: 0.95rem;
}
.cc-birthdate {
  padding: 1.1rem;
}
.cc-hint {
  margin: 0 0 0.7rem;
  color: var(--text-secondary);
  font-size: 0.88rem;
}
.cc-birthdate-row {
  display: flex;
  gap: 0.7rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
.cc-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.cc-field input {
  padding: 0.55rem 0.7rem;
  border-radius: 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  color-scheme: dark;
}
.cc-animals {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.2rem, 1fr));
  gap: 0.5rem;
}
.cc-animal-chip {
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
.cc-animal-chip:hover {
  background: rgba(212, 175, 55, 0.07);
}
.cc-animal-chip.active {
  border-color: var(--gold);
  background: rgba(212, 175, 55, 0.12);
  color: var(--gold-light);
}
.cc-animal-emoji {
  font-size: 1.5rem;
}
.cc-animal-name {
  font-size: 0.74rem;
}
.cc-chart {
  padding: 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-left: 3px solid var(--cc-accent, var(--gold));
}
.cc-chart-head {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.cc-chart-emoji {
  font-size: 3rem;
  line-height: 1;
}
.cc-chart-label {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-muted);
}
.cc-chart-name {
  margin: 0.1rem 0;
  font-family: var(--font-display);
  font-size: 1.5rem;
  color: var(--cc-accent, var(--gold));
}
.cc-chart-born {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.cc-attrs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.cc-attr {
  font-size: 0.78rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}
.cc-error {
  margin: 0.6rem 0 0;
  color: var(--error);
}
.cc-compat-link {
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
