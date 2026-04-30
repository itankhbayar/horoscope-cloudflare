<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ZODIAC_SIGNS, getZodiacInfo } from '../lib/zodiac';
import type { ZodiacSign } from '../lib/types';
import { useCompatibility } from '../composables/useCompatibility';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const { t, locale } = useI18n();

const sign1 = ref<ZodiacSign>('leo');
const sign2 = ref<ZodiacSign>('aquarius');

const { result, loading, error, compareSigns, reset } = useCompatibility();

const sign1Info = computed(() => getZodiacInfo(sign1.value));
const sign2Info = computed(() => getZodiacInfo(sign2.value));

async function runCompare(): Promise<void> {
  await compareSigns(sign1.value, sign2.value);
}

watch(locale, async () => {
  if (result.value) {
    await compareSigns(sign1.value, sign2.value);
  } else {
    reset();
  }
});

function scoreColor(score: number): string {
  if (score >= 80) return '#7bbf6a';
  if (score >= 60) return '#e8d48b';
  if (score >= 40) return '#ff8a5c';
  return '#ff6b6b';
}
</script>

<template>
  <div class="compat-page">
    <header class="page-head">
      <h1>{{ t('compatibility.title') }}</h1>
      <p>{{ t('compatibility.subtitle') }}</p>
    </header>

    <section class="compare-card glass-card">
      <div class="picker">
        <label>
          <span class="label">{{ t('compatibility.firstSign') }}</span>
          <select v-model="sign1" class="form-input">
            <option v-for="sign in ZODIAC_SIGNS" :key="sign.key" :value="sign.key">
              {{ sign.symbol }} {{ t(`zodiac.${sign.key}`) }}
            </option>
          </select>
        </label>
        <span class="vs">✦</span>
        <label>
          <span class="label">{{ t('compatibility.secondSign') }}</span>
          <select v-model="sign2" class="form-input">
            <option v-for="sign in ZODIAC_SIGNS" :key="sign.key" :value="sign.key">
              {{ sign.symbol }} {{ t(`zodiac.${sign.key}`) }}
            </option>
          </select>
        </label>
      </div>
      <button class="btn-celestial compare-btn" @click="runCompare" :disabled="loading">
        <span v-if="loading">✨ {{ t('compatibility.aligning') }}</span>
        <span v-else>{{ t('compatibility.compute') }}</span>
      </button>
    </section>

    <LoadingSpinner v-if="loading" />

    <section v-if="result && !loading" class="result-section">
      <div class="result-hero glass-card">
        <div class="couple">
          <div class="sign-portrait">
            <span class="sign-symbol">{{ sign1Info.symbol }}</span>
            <span class="sign-name">{{ t(`zodiac.${sign1Info.key}`) }}</span>
          </div>
          <span class="heart">❤</span>
          <div class="sign-portrait">
            <span class="sign-symbol">{{ sign2Info.symbol }}</span>
            <span class="sign-name">{{ t(`zodiac.${sign2Info.key}`) }}</span>
          </div>
        </div>
        <div class="overall-score" :style="{ color: scoreColor(result.overallScore) }">
          {{ result.overallScore }}<span class="percent">%</span>
        </div>
        <p class="overall-label">{{ t('compatibility.overallHarmony') }}</p>
        <p class="summary">{{ result.summary }}</p>
      </div>

      <div class="metrics">
        <div class="metric glass-card" v-for="metric in [
          { label: t('compatibility.love'), value: result.loveScore, icon: '❤' },
          { label: t('compatibility.friendship'), value: result.friendshipScore, icon: '✨' },
          { label: t('compatibility.communication'), value: result.communicationScore, icon: '☿' },
        ]" :key="metric.label">
          <p class="metric-label">{{ metric.icon }} {{ metric.label }}</p>
          <div class="bar">
            <div class="fill" :style="{ width: `${metric.value}%`, background: scoreColor(metric.value) }"></div>
          </div>
          <p class="metric-value">{{ metric.value }}%</p>
        </div>
      </div>

      <div class="highlights glass-card">
        <h3>{{ t('compatibility.highlights') }}</h3>
        <ul>
          <li v-for="(h, i) in result.highlights" :key="i">{{ h }}</li>
        </ul>
      </div>
    </section>

    <p v-if="error" class="error-msg">{{ error }}</p>
  </div>
</template>

<style scoped>
.compat-page {
  max-width: 920px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.page-head { text-align: center; }
.page-head h1 {
  font-family: var(--font-display);
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 0.4rem;
}
.page-head p { color: var(--text-muted); }
.compare-card {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.picker {
  display: flex;
  align-items: end;
  gap: 1rem;
}
.picker label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-muted);
}
.vs { color: var(--gold); font-size: 1.4rem; padding-bottom: 0.7rem; }
.compare-btn { width: 100%; }
.result-section {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.result-hero {
  padding: 2rem;
  text-align: center;
}
.couple {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}
.sign-portrait { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
.sign-symbol {
  font-size: 3.5rem;
  color: var(--gold);
  filter: drop-shadow(0 0 18px var(--gold-dim));
}
.sign-name { font-family: var(--font-display); font-size: 1.1rem; }
.heart { font-size: 1.6rem; color: #ff6b9c; }
.overall-score {
  font-family: var(--font-display);
  font-size: 4.5rem;
  font-weight: 600;
  line-height: 1;
}
.percent { font-size: 1.8rem; opacity: 0.7; margin-left: 0.2rem; }
.overall-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-muted);
  margin: 0.4rem 0 1rem;
}
.summary {
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--text-secondary);
  font-style: italic;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
@media (max-width: 800px) { .metrics { grid-template-columns: 1fr; } }
.metric {
  padding: 1.3rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.metric-label { font-size: 0.85rem; color: var(--text-secondary); }
.bar { height: 8px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; }
.fill { height: 100%; transition: width 0.6s ease; }
.metric-value {
  text-align: right;
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--gold-light);
}
.highlights {
  padding: 1.6rem;
}
.highlights h3 {
  font-family: var(--font-display);
  font-size: 1.1rem;
  margin-bottom: 0.8rem;
  color: var(--text-primary);
}
.highlights ul { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
.highlights li {
  padding: 0.7rem 0.9rem;
  background: rgba(255,255,255,0.03);
  border-left: 2px solid var(--gold);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
</style>
