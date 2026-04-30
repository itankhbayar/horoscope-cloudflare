<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';
import { useProfile } from '../composables/useProfile';
import { useHoroscope } from '../composables/useHoroscope';
import { ZODIAC_SIGNS } from '../lib/zodiac';
import type { ZodiacSign } from '../lib/types';
import ZodiacCard from '../components/ZodiacCard.vue';
import PredictionCard from '../components/PredictionCard.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const { t, locale } = useI18n();
const { user } = useAuth();
const { profile, load: loadProfile } = useProfile();
const { horoscope, loading, load: loadHoroscope, reset: resetHoroscope } = useHoroscope();

const selectedSign = ref<ZodiacSign | null>(null);

const sunSign = computed<ZodiacSign | null>(() => profile.value?.natalChart?.sunSign ?? null);
const sunSignName = computed(() => (sunSign.value ? t(`zodiac.${sunSign.value}`) : ''));
const sunSignSymbol = computed(() => sunSign.value ? ZODIAC_SIGNS.find((s) => s.key === sunSign.value)?.symbol : '');

const today = computed(() =>
  new Date().toLocaleDateString(locale.value === 'mn' ? 'mn-MN' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }),
);

onMounted(async () => {
  await loadProfile();
  if (sunSign.value) {
    selectedSign.value = sunSign.value;
    await loadHoroscope(sunSign.value);
  }
});

async function selectSign(sign: ZodiacSign): Promise<void> {
  selectedSign.value = sign;
  await loadHoroscope(sign);
}

watch(locale, async () => {
  resetHoroscope();
  if (selectedSign.value) await loadHoroscope(selectedSign.value);
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return t('home.greetingMorning');
  if (hour < 18) return t('home.greetingAfternoon');
  return t('home.greetingEvening');
});

const firstName = computed(() => user.value?.fullName?.split(' ')[0] ?? t('home.stargazer'));
</script>

<template>
  <div class="home-page">
    <header class="hero">
      <p class="greeting">{{ greeting }}, {{ firstName }}</p>
      <h1 class="title">{{ t('home.yourStarsToday') }}</h1>
      <p class="date">{{ today }}</p>
      <div v-if="sunSign" class="big-sign">
        <span class="big-sign-symbol">{{ sunSignSymbol }}</span>
        <span class="big-sign-name">{{ sunSignName }} {{ t('home.sunSuffix') }}</span>
      </div>
    </header>

    <section class="zodiac-strip">
      <p class="section-label">{{ t('home.browseAllSigns') }}</p>
      <div class="zodiac-grid">
        <ZodiacCard
          v-for="sign in ZODIAC_SIGNS"
          :key="sign.key"
          :sign="sign"
          compact
          :active="selectedSign === sign.key"
          @select="selectSign(sign.key)"
        />
      </div>
    </section>

    <LoadingSpinner v-if="loading" :label="t('home.readingStars')" />

    <section v-if="horoscope && !loading" class="horoscope-section">
      <div class="overall-card glass-card">
        <p class="overall-eyebrow">{{ t('home.todayOverall') }}</p>
        <p class="overall-text">{{ horoscope.overall }}</p>
      </div>

      <div class="prediction-grid">
        <PredictionCard :title="t('home.love')" icon="❤" accent="#ff6b9c" :body="horoscope.love" />
        <PredictionCard :title="t('home.career')" icon="♃" accent="#9ec6ff" :body="horoscope.career" />
        <PredictionCard :title="t('home.health')" icon="✚" accent="#7bbf6a" :body="horoscope.health" />
      </div>

      <div class="lucky-row">
        <div class="lucky-card glass-card">
          <span class="lucky-label">{{ t('home.luckyNumber') }}</span>
          <span class="lucky-value">{{ horoscope.luckyNumber }}</span>
        </div>
        <div class="lucky-card glass-card">
          <span class="lucky-label">{{ t('home.luckyColor') }}</span>
          <span class="lucky-value lucky-color">{{ horoscope.luckyColor }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}
.hero { text-align: center; margin-bottom: 2.5rem; }
.greeting {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 2px;
}
.title {
  font-family: var(--font-display);
  font-size: 2.4rem;
  font-weight: 700;
  margin: 0.4rem 0 0.2rem;
  letter-spacing: 1px;
}
.date { color: var(--text-secondary); font-size: 0.95rem; }
.big-sign {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  margin-top: 1.2rem;
  padding: 0.5rem 1.5rem;
  border-radius: 999px;
  background: var(--gold-glow);
  border: 1px solid var(--glass-border);
}
.big-sign-symbol { font-size: 1.6rem; color: var(--gold); }
.big-sign-name {
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 1px;
}
.zodiac-strip { margin-bottom: 2.4rem; }
.section-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 0.9rem;
}
.zodiac-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}
@media (max-width: 720px) { .zodiac-grid { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 480px) { .zodiac-grid { grid-template-columns: repeat(3, 1fr); } }
.horoscope-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.overall-card {
  padding: 2rem;
  text-align: center;
}
.overall-eyebrow {
  font-size: 0.7rem;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 0.9rem;
}
.overall-text {
  font-family: var(--font-display);
  font-size: 1.4rem;
  line-height: 1.5;
  color: var(--text-primary);
  font-style: italic;
}
.prediction-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
@media (max-width: 800px) { .prediction-grid { grid-template-columns: 1fr; } }
.lucky-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.lucky-card {
  padding: 1.4rem 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: center;
}
.lucky-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 2px;
}
.lucky-value {
  font-family: var(--font-display);
  font-size: 1.8rem;
  color: var(--gold-light);
  font-weight: 600;
}
.lucky-value.lucky-color { font-size: 1.3rem; }
</style>
