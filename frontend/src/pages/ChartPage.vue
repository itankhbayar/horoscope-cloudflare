<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useProfile } from '../composables/useProfile';
import { useAuth } from '../composables/useAuth';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import GuestResultGate from '../components/GuestResultGate.vue';
import LockedFeatureCard from '../components/LockedFeatureCard.vue';
import NatalChartWheel from '../components/NatalChartWheel.vue';
import PlanetTable from '../components/PlanetTable.vue';
import AspectList from '../components/AspectList.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { getZodiacInfo } from '../lib/zodiac';
import { fetchChartReading } from '../lib/chartService';
import type { ChartReadingContent } from '../lib/types';

const { t, locale } = useI18n();
const router = useRouter();
const { profile, loading, error, load } = useProfile();
const { isAuthenticated, user } = useAuth();

const isPremium = computed(() => Boolean(user.value?.isPremium));

// Personalized, Claude-generated reading of this chart. Premium-only and generated once
// per chart (a birth chart never changes), so the first reveal calls Claude (~20–40s) and
// the result is cached server-side; pressing again just returns the stored reading.
const reading = ref<ChartReadingContent | null>(null);
const readingLoading = ref(false);
const readingError = ref<string | null>(null);

async function revealReading(): Promise<void> {
  readingLoading.value = true;
  readingError.value = null;
  try {
    const res = await fetchChartReading(locale.value);
    reading.value = res.reading;
  } catch (e) {
    readingError.value = (e as Error).message ?? t('chart.reading.error');
  } finally {
    readingLoading.value = false;
  }
}

// Glyphs that give each themed card a distinct, on-brand celestial marker.
const READING_ICONS: Record<string, string> = {
  summary: '☉',
  strengths: '✦',
  challenges: '☍',
  relationships: '☽',
  career: '★',
  growth: '✷',
};

// The summary is featured as a lead block; the remaining themes fill a card grid below it.
const detailSections = computed(() =>
  reading.value
    ? ([
        { key: 'strengths', text: reading.value.strengths },
        { key: 'challenges', text: reading.value.challenges },
        { key: 'relationships', text: reading.value.relationships },
        { key: 'career', text: reading.value.career },
        { key: 'growth', text: reading.value.growth },
      ] as const)
    : [],
);

// The natal chart is built from the signed-in user's birth data, so guests see a
// preview gate instead of an empty chart they could never compute.
onMounted(() => {
  if (isAuthenticated.value) void load();
});

const sunInfo = computed(() =>
  profile.value?.natalChart ? getZodiacInfo(profile.value.natalChart.sunSign) : null,
);
const moonInfo = computed(() =>
  profile.value?.natalChart ? getZodiacInfo(profile.value.natalChart.moonSign) : null,
);
const risingInfo = computed(() =>
  profile.value?.natalChart?.risingSign ? getZodiacInfo(profile.value.natalChart.risingSign) : null,
);

// Aspects are dense; let users collapse the list if they'd rather not see all of it.
const showAspects = ref(true);
// The planet table is long (especially on mobile); allow collapsing it too.
const showPositions = ref(true);
</script>

<template>
  <AppContainer size="xl">
    <ScreenLayout class="chart-page">
      <GuestResultGate v-if="!isAuthenticated" :message="t('guestGate.chartTitle')" />

      <template v-else>
      <LoadingSpinner v-if="loading && !profile" :label="t('chart.loading')" />
      <p v-if="error" class="state error">{{ error }}</p>
      <p v-if="!loading && !profile && !error" class="state">{{ t('chart.noData') }}</p>

      <template v-if="profile?.natalChart">
        <section class="glass-card chart-header">
          <h1>{{ t('chart.title') }}</h1>
        </section>

        <section class="big-three">
          <div class="big-card glass-card">
            <p class="big-label">{{ t('chart.sun') }}</p>
            <p class="big-symbol" :style="{ color: '#e8d48b' }">{{ sunInfo?.symbol }}</p>
            <p class="big-sign-name">{{ sunInfo ? t(`zodiac.${sunInfo.key}`) : '' }}</p>
          </div>
          <div class="big-card glass-card">
            <p class="big-label">{{ t('chart.moon') }}</p>
            <p class="big-symbol" :style="{ color: '#9ec6ff' }">{{ moonInfo?.symbol }}</p>
            <p class="big-sign-name">{{ moonInfo ? t(`zodiac.${moonInfo.key}`) : '' }}</p>
          </div>
          <div class="big-card glass-card">
            <p class="big-label">{{ t('chart.rising') }}</p>
            <p v-if="risingInfo" class="big-symbol" :style="{ color: '#ff8a5c' }">{{ risingInfo.symbol }}</p>
            <p v-else class="big-symbol muted">—</p>
            <p class="big-sign-name">{{ risingInfo ? t(`zodiac.${risingInfo.key}`) : t('chart.unknown') }}</p>
          </div>
        </section>

        <section class="chart-grid">
          <div class="glass-card chart-section">
            <h2 class="section-title">{{ t('chart.wheel') }}</h2>
            <NatalChartWheel :chart="profile.natalChart" />
          </div>
          <div class="glass-card chart-section">
            <div class="aspect-head">
              <h2 class="section-title">{{ t('chart.positions') }}</h2>
              <button
                type="button"
                class="aspect-toggle"
                :aria-expanded="showPositions"
                @click="showPositions = !showPositions"
              >
                {{ showPositions ? t('chart.aspectsHide') : t('chart.aspectsShow') }}
              </button>
            </div>
            <PlanetTable v-if="showPositions" :planets="profile.natalChart.planets" />
          </div>
        </section>

        <section class="glass-card aspect-section">
          <div class="aspect-head">
            <h2 class="section-title">{{ t('chart.aspects') }}</h2>
            <button
              type="button"
              class="aspect-toggle"
              :aria-expanded="showAspects"
              @click="showAspects = !showAspects"
            >
              {{ showAspects ? t('chart.aspectsHide') : t('chart.aspectsShow') }}
            </button>
          </div>
          <AspectList v-if="showAspects" :aspects="profile.natalChart.aspects" />
        </section>

        <!-- Premium: a personalized Claude reading of this specific chart (one per chart). -->
        <LockedFeatureCard
          v-if="!isPremium"
          :title="t('chart.reading.lockedTitle')"
          :description="t('chart.reading.lockedDesc')"
          icon="✶"
          @unlock="router.push({ name: 'premium' })"
        />
        <section v-else class="glass-card reading-section">
          <header class="reading-head">
            <span class="reading-badge">{{ t('premium.badge') }}</span>
            <h2 class="section-title reading-title">{{ t('chart.reading.title') }}</h2>
          </header>

          <article v-if="reading" class="reading-body">
            <div class="reading-summary">
              <span class="reading-summary-icon" aria-hidden="true">{{ READING_ICONS.summary }}</span>
              <div>
                <h3 class="reading-label">{{ t('chart.reading.summary') }}</h3>
                <p class="reading-text">{{ reading.summary }}</p>
              </div>
            </div>

            <div class="reading-grid">
              <div v-for="s in detailSections" :key="s.key" class="reading-field">
                <div class="reading-field-head">
                  <span class="reading-icon" aria-hidden="true">{{ READING_ICONS[s.key] }}</span>
                  <h3 class="reading-label">{{ t(`chart.reading.${s.key}`) }}</h3>
                </div>
                <p class="reading-text">{{ s.text }}</p>
              </div>
            </div>
          </article>

          <div v-else-if="readingLoading" class="reading-state" role="status" aria-live="polite">
            <LoadingSpinner :label="t('chart.reading.loading')" />
          </div>

          <template v-else>
            <p class="reading-intro">{{ t('chart.reading.intro') }}</p>
            <p v-if="readingError" class="state error reading-err" role="alert">{{ readingError }}</p>
            <button type="button" class="btn-celestial reading-cta" @click="revealReading">
              {{ t('chart.reading.cta') }}
            </button>
          </template>
        </section>
      </template>
      </template>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.chart-page { display: flex; flex-direction: column; gap: 1.5rem; }
.state { color: var(--text-muted); }
.state.error { color: #ef9a9a; }
.chart-header {
  padding: 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.chart-header h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.45rem;
  color: var(--text-primary);
}
.big-three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.big-card { padding: 1.4rem; text-align: center; }
.big-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: var(--text-muted); }
.big-symbol { font-size: 3rem; filter: drop-shadow(0 0 12px currentColor); }
.big-symbol.muted { opacity: 0.5; }
.big-sign-name { font-family: var(--font-display); font-size: 1.3rem; color: var(--text-primary); }
.chart-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 1rem; }
.chart-section, .aspect-section { padding: 1.4rem; }
.section-title {
  font-family: var(--font-display);
  font-size: 1.16rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 0.5rem;
}
.aspect-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 0.5rem;
}
.aspect-head .section-title {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}
.aspect-toggle {
  flex: 0 0 auto;
  align-self: center;
  margin-bottom: 0.4rem;
  padding: 0.35rem 0.95rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: rgba(15, 15, 40, 0.55);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}
.aspect-toggle:hover {
  border-color: var(--glass-border-hover);
  color: var(--text-primary);
}
.aspect-toggle:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
/* ---- Personal chart reading (premium) ---- */
.reading-section {
  position: relative;
  overflow: hidden;
  padding: 1.6rem;
}
/* Soft gold aura in the corner to set the premium reading apart from the data cards. */
.reading-section::before {
  content: '';
  position: absolute;
  top: -45%;
  right: -12%;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, var(--gold-glow), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.reading-section > * { position: relative; z-index: 1; }
.reading-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.2rem;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 0.6rem;
  flex-wrap: wrap;
}
.reading-title { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
.reading-badge {
  flex: 0 0 auto;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: var(--gold-glow);
  border: 1px solid var(--glass-border);
  color: var(--gold-light);
  font-size: 0.62rem;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.reading-body { display: flex; flex-direction: column; gap: 1rem; }
/* Lead "who you are" block, visually elevated above the themed grid. */
.reading-summary {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1.2rem 1.3rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--gold-glow), transparent 65%);
}
.reading-summary-icon {
  font-size: 1.9rem;
  line-height: 1;
  color: var(--gold-light);
  filter: drop-shadow(0 0 10px var(--gold-dim));
}
.reading-summary .reading-text { color: var(--text-primary); font-size: 1rem; }
.reading-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}
.reading-field {
  padding: 1.1rem 1.2rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: rgba(15, 15, 40, 0.4);
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.reading-field:hover {
  border-color: var(--glass-border-hover);
  transform: translateY(-2px);
}
.reading-field-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}
.reading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--gold-glow);
  border: 1px solid var(--glass-border);
  color: var(--gold-light);
  font-size: 1rem;
}
.reading-label {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 0.3px;
  color: var(--text-primary);
}
.reading-text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.65;
}
.reading-intro {
  max-width: 60ch;
  margin-bottom: 1.2rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
}
.reading-state { padding: 1.5rem 0; }
.reading-err { margin-bottom: 1rem; }

@media (max-width: 900px) {
  .chart-grid, .reading-grid { grid-template-columns: 1fr; }
}

/* Phones: keep the Sun/Moon/Rising trio side by side (they're compact summary
   cards) instead of stacking into three oversized blocks, and tighten the
   surrounding cards so the layout breathes on a narrow screen. */
@media (max-width: 600px) {
  .chart-page { gap: 1rem; }
  .chart-header { padding: 1rem 1.1rem; }
  .chart-header h1 { font-size: 1.25rem; }
  .big-three { gap: 0.55rem; }
  .big-card { padding: 0.95rem 0.45rem; }
  .big-label { font-size: 0.58rem; letter-spacing: 1.2px; }
  .big-symbol { font-size: 2.1rem; }
  .big-sign-name { font-size: 0.98rem; }
  .chart-section,
  .aspect-section { padding: 1.1rem; }
  .reading-section { padding: 1.2rem; }
  .reading-summary { flex-direction: column; gap: 0.65rem; padding: 1rem; }
  .reading-field { padding: 1rem; }
}

@media (max-width: 360px) {
  .big-symbol { font-size: 1.8rem; }
  .big-sign-name { font-size: 0.9rem; }
}
</style>

