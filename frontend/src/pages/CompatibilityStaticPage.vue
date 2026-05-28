<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { applyDocumentMeta } from '../composables/useDocumentMeta';
import { getZodiacInfo, ZODIAC_SIGNS } from '../lib/zodiac';
import type { ZodiacSign } from '../lib/types';
import { computeSignCompatibility } from '../lib/computeSignCompatibility';
import { compatibilityShareLocale, compatibilityThemeFor } from '../lib/compatibilityTheme';
import { guestCompareTarget, landingShareSource, parseCompatibilityScoreParam } from '../lib/compatibilityLanding';
import { compatibilityAnalyticsContext } from '../lib/compatibilityAnalytics';
import { resolveCompatibilityShareRef } from '../lib/compatibilityShareRef';
import { track } from '../lib/analytics';

const route = useRoute();
const { t, locale } = useI18n();

const pickerRef = ref<HTMLElement | null>(null);
const recipientSign = ref<ZodiacSign | null>(null);
const compareWith = ref<ZodiacSign | null>(null);
const scoreDisplayedTracked = ref(false);
const guestCompareTrackedKey = ref('');

function normalizeSign(value: unknown): ZodiacSign {
  const slug = String(value ?? '').toLowerCase();
  return ZODIAC_SIGNS.some((sign) => sign.key === slug) ? (slug as ZodiacSign) : 'aries';
}

const sign1 = computed(() => normalizeSign(route.params.sign1));
const sign2 = computed(() => normalizeSign(route.params.sign2));
const info1 = computed(() => getZodiacInfo(sign1.value));
const info2 = computed(() => getZodiacInfo(sign2.value));
const lang = computed(() => compatibilityShareLocale(locale.value));

const sharedResult = computed(() => computeSignCompatibility(sign1.value, sign2.value, lang.value));
const sharedTheme = computed(() => compatibilityThemeFor(sharedResult.value.overallScore, lang.value));
const urlScore = computed(() => parseCompatibilityScoreParam(route.query.score));

const recipientResult = computed(() => {
  if (!recipientSign.value || !compareWith.value) return null;
  return computeSignCompatibility(recipientSign.value, compareWith.value, lang.value);
});

const recipientTheme = computed(() =>
  recipientResult.value ? compatibilityThemeFor(recipientResult.value.overallScore, lang.value) : null,
);

const pageTitle = computed(() =>
  t('compatibilityLanding.seoTitle', {
    sign1: t(`zodiac.${info1.value.key}`),
    sign2: t(`zodiac.${info2.value.key}`),
    score: sharedResult.value.overallScore,
  }),
);

const pageDescription = computed(() =>
  t('compatibilityLanding.seoDescription', {
    sign1: t(`zodiac.${info1.value.key}`),
    sign2: t(`zodiac.${info2.value.key}`),
    score: sharedResult.value.overallScore,
    theme: sharedTheme.value.title,
  }),
);

function syncDocumentMeta(): void {
  applyDocumentMeta({
    title: pageTitle.value,
    description: pageDescription.value,
    canonicalPath: `/compatibility/${sign1.value}/${sign2.value}`,
    type: 'article',
  });
}

function scoreColor(score: number): string {
  if (score >= 80) return '#7bbf6a';
  if (score >= 60) return '#e8d48b';
  if (score >= 40) return '#ff8a5c';
  return '#ff6b6b';
}

function landingAnalyticsBase() {
  return {
    ...compatibilityAnalyticsContext({
      locale: locale.value,
      sign1: sign1.value,
      sign2: sign2.value,
      sharedScore: sharedResult.value.overallScore,
      query: route.query,
    }),
    source: landingShareSource(route.query.utm_source),
    url_score: urlScore.value,
  };
}

function trackScoreDisplayed(): void {
  if (scoreDisplayedTracked.value) return;
  scoreDisplayedTracked.value = true;
  track('compatibility_landing_score_displayed', landingAnalyticsBase());
}

function scrollToPicker(): void {
  track('compatibility_landing_cta_clicked', {
    ...landingAnalyticsBase(),
    cta: 'see_your_match',
  });
  void nextTick(() => {
    pickerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function selectRecipientSign(sign: ZodiacSign): void {
  recipientSign.value = sign;
  compareWith.value = guestCompareTarget(sign, sign1.value, sign2.value);
  guestCompareTrackedKey.value = '';
  track('compatibility_landing_sign_selected', {
    ...landingAnalyticsBase(),
    recipient_sign: sign,
    compare_with: compareWith.value,
  });
}

function toggleCompareTarget(target: ZodiacSign): void {
  if (!recipientSign.value) return;
  compareWith.value = target;
  track('compatibility_landing_cta_clicked', {
    ...landingAnalyticsBase(),
    cta: 'toggle_compare_target',
    compare_with: target,
  });
}

function onSaveMatchClick(): void {
  track('compatibility_landing_cta_clicked', {
    ...landingAnalyticsBase(),
    cta: 'save_match',
  });
}

watch(recipientResult, (next) => {
  if (!next || !recipientSign.value) return;
  const dedupeKey = `${recipientSign.value}:${next.sign2}:${next.overallScore}`;
  if (guestCompareTrackedKey.value === dedupeKey) return;
  guestCompareTrackedKey.value = dedupeKey;
  track('compatibility_guest_compare_completed', {
    ...landingAnalyticsBase(),
    recipient_sign: recipientSign.value,
    compare_with: next.sign2,
    score: next.overallScore,
  });
});

onMounted(() => {
  syncDocumentMeta();
  resolveCompatibilityShareRef(route.query);
  track('compatibility_share_landing_viewed', landingAnalyticsBase());
  trackScoreDisplayed();
});

watch([pageTitle, pageDescription, sign1, sign2], () => {
  syncDocumentMeta();
});

watch([sign1, sign2, locale], () => {
  scoreDisplayedTracked.value = false;
  recipientSign.value = null;
  compareWith.value = null;
  guestCompareTrackedKey.value = '';
  trackScoreDisplayed();
});

const registerFromLanding = computed(() => {
  const shareRef = resolveCompatibilityShareRef(route.query);
  return {
    path: '/register',
    query: {
      signup_source: 'compatibility_landing',
      sign1: sign1.value,
      sign2: sign2.value,
      utm_source: route.query.utm_source,
      utm_medium: route.query.utm_medium,
      utm_campaign: route.query.utm_campaign,
      ...(shareRef ? { share_ref: shareRef } : {}),
    },
  };
});
</script>

<template>
  <AppContainer size="lg">
    <ScreenLayout class="compat-landing-page">
      <section class="hero glass-card">
        <p class="kicker">{{ t('compatibilityLanding.sharedKicker') }}</p>
        <div class="pair-row">
          <div class="sign-chip">
            <span class="symbol">{{ info1.symbol }}</span>
            <span class="name">{{ t(`zodiac.${info1.key}`) }}</span>
          </div>
          <span class="plus">+</span>
          <div class="sign-chip">
            <span class="symbol">{{ info2.symbol }}</span>
            <span class="name">{{ t(`zodiac.${info2.key}`) }}</span>
          </div>
        </div>
        <p class="score" :style="{ color: scoreColor(sharedResult.overallScore) }">
          {{ sharedResult.overallScore }}<span class="pct">%</span>
        </p>
        <p class="score-label">{{ t('compatibilityLanding.matchLabel') }}</p>
        <h1 class="theme-title">{{ sharedTheme.title }}</h1>
        <p class="theme-summary">{{ sharedTheme.summary }}</p>
        <p class="metric-line">
          {{
            t('compatibilityLanding.metricLine', {
              love: sharedResult.loveScore,
              friendship: sharedResult.friendshipScore,
              communication: sharedResult.communicationScore,
            })
          }}
        </p>
        <button type="button" class="btn-celestial primary-cta" @click="scrollToPicker">
          {{ t('compatibilityLanding.ctaPrimary') }}
        </button>
      </section>

      <section ref="pickerRef" class="picker-section glass-card">
        <h2>{{ t('compatibilityLanding.pickerTitle') }}</h2>
        <p class="picker-sub">{{ t('compatibilityLanding.pickerSubtitle') }}</p>
        <div class="sign-grid" role="radiogroup" :aria-label="t('compatibilityLanding.pickerTitle')">
          <button
            v-for="sign in ZODIAC_SIGNS"
            :key="sign.key"
            type="button"
            class="sign-pick"
            :class="{ active: recipientSign === sign.key }"
            role="radio"
            :aria-checked="recipientSign === sign.key"
            @click="selectRecipientSign(sign.key)"
          >
            <span class="pick-symbol">{{ sign.symbol }}</span>
            <span class="pick-name">{{ t(`zodiac.${sign.key}`) }}</span>
          </button>
        </div>
      </section>

      <section v-if="recipientResult && recipientTheme" class="guest-result glass-card">
        <p class="kicker">{{ t('compatibilityLanding.yourMatchKicker') }}</p>
        <div class="pair-row compact">
          <div class="sign-chip">
            <span class="symbol">{{ getZodiacInfo(recipientResult.sign1).symbol }}</span>
            <span class="name">{{ t(`zodiac.${recipientResult.sign1}`) }}</span>
          </div>
          <span class="plus">+</span>
          <div class="sign-chip">
            <span class="symbol">{{ getZodiacInfo(recipientResult.sign2).symbol }}</span>
            <span class="name">{{ t(`zodiac.${recipientResult.sign2}`) }}</span>
          </div>
        </div>
        <p class="score small" :style="{ color: scoreColor(recipientResult.overallScore) }">
          {{ recipientResult.overallScore }}<span class="pct">%</span>
        </p>
        <h3>{{ recipientTheme.title }}</h3>
        <p class="guest-summary">{{ recipientResult.summary }}</p>
        <ul v-if="recipientResult.highlights.length" class="highlights">
          <li v-for="(line, index) in recipientResult.highlights.slice(0, 2)" :key="index">{{ line }}</li>
        </ul>
        <div class="compare-toggle" role="group" :aria-label="t('compatibilityLanding.compareToggleLabel')">
          <button
            type="button"
            class="toggle-chip"
            :class="{ active: compareWith === sign1 }"
            @click="toggleCompareTarget(sign1)"
          >
            {{ t('compatibilityLanding.compareWith', { sign: t(`zodiac.${info1.key}`) }) }}
          </button>
          <button
            type="button"
            class="toggle-chip"
            :class="{ active: compareWith === sign2 }"
            @click="toggleCompareTarget(sign2)"
          >
            {{ t('compatibilityLanding.compareWith', { sign: t(`zodiac.${info2.key}`) }) }}
          </button>
        </div>
        <router-link :to="registerFromLanding" class="secondary-cta" @click="onSaveMatchClick">
          {{ t('compatibilityLanding.saveCta') }}
        </router-link>
      </section>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.compat-landing-page {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5) 0 var(--space-7);
}
.hero,
.picker-section,
.guest-result {
  padding: clamp(1.25rem, 4vw, 2rem);
}
.kicker {
  color: var(--gold-light);
  font-size: var(--text-xs);
  letter-spacing: 1.6px;
  text-transform: uppercase;
  margin-bottom: var(--space-3);
}
.pair-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}
.pair-row.compact {
  margin-bottom: var(--space-2);
}
.sign-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.symbol {
  font-size: clamp(2rem, 8vw, 3rem);
  color: var(--gold-light);
}
.name {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.plus {
  color: var(--gold);
  font-size: 1.4rem;
}
.score {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 14vw, 5rem);
  font-weight: 700;
  line-height: 1;
  text-align: center;
}
.score.small {
  font-size: clamp(2.5rem, 10vw, 3.5rem);
}
.pct {
  font-size: 0.45em;
  opacity: 0.75;
}
.score-label {
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}
.theme-title {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 5vw, 2.2rem);
  text-align: center;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}
.theme-summary,
.picker-sub,
.guest-summary,
.metric-line {
  color: var(--text-secondary);
  text-align: center;
  max-width: 42rem;
  margin: 0 auto var(--space-3);
  line-height: 1.55;
}
.metric-line {
  font-size: var(--text-sm);
  color: var(--gold-light);
}
.primary-cta {
  display: block;
  width: min(100%, 22rem);
  margin: var(--space-2) auto 0;
}
.picker-section h2 {
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 4vw, 1.8rem);
  text-align: center;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}
.sign-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-3);
}
@media (max-width: 520px) {
  .sign-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.sign-pick {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 0.65rem 0.35rem;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}
.sign-pick.active {
  border-color: var(--gold);
  background: rgba(244, 213, 122, 0.12);
  color: var(--text-primary);
}
.pick-symbol {
  font-size: 1.5rem;
  color: var(--gold-light);
}
.pick-name {
  font-size: 0.65rem;
  line-height: 1.2;
}
.guest-result h3 {
  font-family: var(--font-display);
  text-align: center;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}
.highlights {
  list-style: none;
  display: grid;
  gap: var(--space-2);
  margin: var(--space-3) auto;
  max-width: 40rem;
}
.highlights li {
  padding: 0.65rem 0.85rem;
  border-left: 2px solid var(--gold);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}
.compare-toggle {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin: var(--space-3) 0;
}
.toggle-chip {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: var(--text-muted);
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  font-size: var(--text-sm);
  cursor: pointer;
}
.toggle-chip.active {
  border-color: var(--gold);
  color: var(--gold-light);
}
.secondary-cta {
  display: block;
  width: fit-content;
  margin: var(--space-2) auto 0;
  color: var(--gold-light);
  text-decoration: underline;
  text-underline-offset: 3px;
  font-size: var(--text-sm);
}
</style>
