<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useProfile } from '../composables/useProfile';
import { getZodiacInfo } from '../lib/zodiac';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import NatalChartWheel from '../components/NatalChartWheel.vue';
import PlanetTable from '../components/PlanetTable.vue';
import AspectList from '../components/AspectList.vue';

const { t } = useI18n();
const { profile, loading, load, recompute } = useProfile();

onMounted(load);

const sunInfo = computed(() => profile.value?.natalChart ? getZodiacInfo(profile.value.natalChart.sunSign) : null);
const moonInfo = computed(() => profile.value?.natalChart ? getZodiacInfo(profile.value.natalChart.moonSign) : null);
const risingInfo = computed(() => profile.value?.natalChart?.risingSign ? getZodiacInfo(profile.value.natalChart.risingSign) : null);
</script>

<template>
  <div class="profile-page">
    <LoadingSpinner v-if="loading && !profile" :label="t('profile.castingChart')" />

    <template v-if="profile">
      <header class="profile-header glass-card">
        <div class="user-block">
          <h1>{{ profile.user.fullName }}</h1>
          <p class="email">{{ profile.user.email }}</p>
          <p v-if="profile.birthProfile" class="birth-info">
            {{ t('profile.born') }} {{ profile.birthProfile.birthDate }}
            <span v-if="profile.birthProfile.birthTime"> {{ t('profile.at') }} {{ profile.birthProfile.birthTime }}</span>
            {{ t('profile.in') }} {{ profile.birthProfile.birthCity }}<span v-if="profile.birthProfile.birthCountry">, {{ profile.birthProfile.birthCountry }}</span>
          </p>
        </div>
        <button class="secondary-btn" @click="recompute" :disabled="loading">{{ t('profile.recompute') }}</button>
      </header>

      <section v-if="profile.natalChart" class="big-three">
        <div class="big-card glass-card">
          <p class="big-label">{{ t('profile.sun') }}</p>
          <p class="big-symbol" :style="{ color: '#e8d48b' }">{{ sunInfo?.symbol }}</p>
          <p class="big-sign-name">{{ sunInfo ? t(`zodiac.${sunInfo.key}`) : '' }}</p>
          <p class="big-meta">
            <span v-if="sunInfo">{{ t(`elements.${sunInfo.element}`) }} · {{ t(`modalities.${sunInfo.modality}`) }}</span>
          </p>
        </div>
        <div class="big-card glass-card">
          <p class="big-label">{{ t('profile.moon') }}</p>
          <p class="big-symbol" :style="{ color: '#9ec6ff' }">{{ moonInfo?.symbol }}</p>
          <p class="big-sign-name">{{ moonInfo ? t(`zodiac.${moonInfo.key}`) : '' }}</p>
          <p class="big-meta">
            <span v-if="moonInfo">{{ t(`elements.${moonInfo.element}`) }} · {{ t(`modalities.${moonInfo.modality}`) }}</span>
          </p>
        </div>
        <div class="big-card glass-card">
          <p class="big-label">{{ t('profile.rising') }}</p>
          <p v-if="risingInfo" class="big-symbol" :style="{ color: '#ff8a5c' }">{{ risingInfo.symbol }}</p>
          <p v-else class="big-symbol muted">—</p>
          <p class="big-sign-name">{{ risingInfo ? t(`zodiac.${risingInfo.key}`) : t('profile.unknown') }}</p>
          <p class="big-meta">
            <span v-if="risingInfo">{{ t(`elements.${risingInfo.element}`) }} · {{ t(`modalities.${risingInfo.modality}`) }}</span>
            <span v-else>{{ t('profile.addBirthTime') }}</span>
          </p>
        </div>
      </section>

      <section v-if="profile.natalChart" class="chart-grid">
        <div class="glass-card chart-section">
          <h2 class="section-title">{{ t('profile.natalChart') }}</h2>
          <NatalChartWheel :chart="profile.natalChart" />
        </div>
        <div class="glass-card chart-section">
          <h2 class="section-title">{{ t('profile.planetaryPositions') }}</h2>
          <PlanetTable :planets="profile.natalChart.planets" />
        </div>
      </section>

      <section v-if="profile.natalChart" class="glass-card aspect-section">
        <h2 class="section-title">{{ t('profile.aspects') }}</h2>
        <AspectList :aspects="profile.natalChart.aspects" />
      </section>

      <section v-if="sunInfo" class="glass-card zodiac-details">
        <h2 class="section-title">{{ t('profile.aboutSunSign') }}</h2>
        <div class="details-grid">
          <div>
            <p class="detail-label">{{ t('profile.element') }}</p>
            <p class="detail-value">{{ t(`elements.${sunInfo.element}`) }}</p>
          </div>
          <div>
            <p class="detail-label">{{ t('profile.modality') }}</p>
            <p class="detail-value">{{ t(`modalities.${sunInfo.modality}`) }}</p>
          </div>
          <div>
            <p class="detail-label">{{ t('profile.rulingPlanet') }}</p>
            <p class="detail-value">{{ t(`planets.${sunInfo.rulingPlanet}`) }}</p>
          </div>
          <div>
            <p class="detail-label">{{ t('profile.symbol') }}</p>
            <p class="detail-value">{{ sunInfo.symbol }} {{ t(`zodiac.${sunInfo.key}`) }}</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.profile-header {
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.user-block h1 {
  font-family: var(--font-display);
  font-size: 1.8rem;
  margin-bottom: 0.2rem;
}
.email { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.4rem; }
.birth-info { color: var(--text-muted); font-size: 0.85rem; }
.secondary-btn {
  padding: 0.6rem 1.2rem;
  background: transparent;
  color: var(--gold);
  border: 1px solid var(--gold);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.8rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: all 0.3s ease;
}
.secondary-btn:hover { background: var(--gold); color: var(--bg-deep); }
.big-three {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
@media (max-width: 800px) { .big-three { grid-template-columns: 1fr; } }
.big-card {
  padding: 1.6rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.big-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-muted);
}
.big-symbol {
  font-size: 3.5rem;
  filter: drop-shadow(0 0 14px currentColor);
}
.big-symbol.muted { opacity: 0.4; }
.big-sign-name { font-family: var(--font-display); font-size: 1.4rem; color: var(--text-primary); }
.big-meta { font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.5px; }
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 1.2rem;
}
@media (max-width: 900px) { .chart-grid { grid-template-columns: 1fr; } }
.chart-section, .aspect-section, .zodiac-details { padding: 1.6rem; }
.section-title {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
  margin-bottom: 1.2rem;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 0.6rem;
}
.details-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
@media (max-width: 600px) { .details-grid { grid-template-columns: repeat(2, 1fr); } }
.detail-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  margin-bottom: 0.3rem;
}
.detail-value {
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--text-primary);
  text-transform: capitalize;
}
</style>
