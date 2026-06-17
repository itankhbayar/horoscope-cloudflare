<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useProfile } from '../composables/useProfile';
import { useAuth } from '../composables/useAuth';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import GuestResultGate from '../components/GuestResultGate.vue';
import NatalChartWheel from '../components/NatalChartWheel.vue';
import PlanetTable from '../components/PlanetTable.vue';
import AspectList from '../components/AspectList.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { getZodiacInfo } from '../lib/zodiac';

const { t } = useI18n();
const { profile, loading, error, load } = useProfile();
const { isAuthenticated } = useAuth();

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
            <h2 class="section-title">{{ t('chart.positions') }}</h2>
            <PlanetTable :planets="profile.natalChart.planets" />
          </div>
        </section>

        <section class="glass-card aspect-section">
          <h2 class="section-title">{{ t('chart.aspects') }}</h2>
          <AspectList :aspects="profile.natalChart.aspects" />
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
@media (max-width: 900px) {
  .big-three, .chart-grid { grid-template-columns: 1fr; }
}
</style>

