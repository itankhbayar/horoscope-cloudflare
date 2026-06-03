<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import LockedFeatureCard from '../components/LockedFeatureCard.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { usePremiumStore } from '../stores/premium';
import { track, PAYWALL_CTA_EVENT } from '../lib/analytics';

const { t } = useI18n();
const premiumStore = usePremiumStore();
const { checkoutLoading, error: checkoutError, isPremium } = storeToRefs(premiumStore);

const checkoutLabel = computed(() =>
  checkoutLoading.value ? t('premium.checkoutLoading') : t('premium.trialCta'),
);

const trialFeatures = computed(() => [
  t('premium.trialFeature1'),
  t('premium.trialFeature2'),
  t('premium.trialFeature3'),
  t('premium.trialFeature4'),
]);

async function goPremium() {
  // CTA tap only. The real `trial_started` is emitted by the Stripe webhook once the
  // subscription is confirmed `trialing`, so we never double-count from the client.
  track(PAYWALL_CTA_EVENT, { source: 'premium_page', hasTrial: true });
  const url = await premiumStore.startCheckout(t('premium.checkoutFailed'));
  if (url) window.location.href = url;
}

const features = computed(() => [
  {
    title: t('premium.features.ai.title'),
    description: t('premium.features.ai.description'),
    icon: '✨',
  },
  {
    title: t('premium.features.tarot.title'),
    description: t('premium.features.tarot.description'),
    icon: '☼',
  },
  {
    title: t('premium.features.personal.title'),
    description: t('premium.features.personal.description'),
    icon: '☽',
  },
]);

track('paywall_viewed', { isPremium: isPremium.value });
</script>

<template>
  <AppContainer size="xl">
    <ScreenLayout class="premium-page">
    <header class="page-head">
      <p class="badge">{{ t('premium.badge') }}</p>
      <h1>{{ t('premium.title') }}</h1>
      <p class="subtitle">{{ t('premium.subtitle') }}</p>
    </header>

    <section class="features-grid">
      <LockedFeatureCard
        v-for="f in features"
        :key="f.title"
        :title="f.title"
        :description="f.description"
        :icon="f.icon"
      />
    </section>

    <section class="cta glass-card">
      <template v-if="isPremium">
        <h2>{{ t('premium.premiumActiveTitle') }}</h2>
        <p>{{ t('premium.premiumActiveBody') }}</p>
      </template>
      <template v-else>
        <h2>{{ t('premium.upgradeTitle') }}</h2>
        <p>{{ t('premium.upgradeBody') }}</p>
        <ul class="trial-features">
          <li v-for="feature in trialFeatures" :key="feature">
            <span class="check" aria-hidden="true">✓</span>{{ feature }}
          </li>
        </ul>
        <p v-if="checkoutError" class="checkout-error" role="alert">{{ checkoutError }}</p>
        <button
          type="button"
          class="btn-celestial go-premium"
          :disabled="checkoutLoading"
          @click="goPremium"
        >
          {{ checkoutLabel }}
        </button>
        <p class="trial-footer">{{ t('premium.trialFooter') }}</p>
      </template>
    </section>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.premium-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
.page-head { text-align: center; }
.badge {
  display: inline-block;
  padding: 0.4rem 1rem;
  background: var(--gold-glow);
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  color: var(--gold-light);
  font-size: 0.75rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 1rem;
}
.page-head h1 {
  font-family: var(--font-display);
  font-size: 2.4rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  letter-spacing: 1px;
}
.subtitle { color: var(--text-muted); max-width: 540px; margin: 0 auto; }
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.2rem;
}
@media (max-width: 800px) { .features-grid { grid-template-columns: 1fr; } }
.cta {
  text-align: center;
  padding: 2.5rem 2rem;
}
.cta h2 {
  font-family: var(--font-display);
  font-size: 1.6rem;
  margin-bottom: 0.5rem;
}
.cta p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}
.cta .btn-celestial.go-premium {
  max-width: 320px;
  margin: 0 auto;
}
.checkout-error {
  color: var(--danger, #e57373);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}
.trial-features {
  list-style: none;
  margin: 0 auto 1.5rem;
  padding: 0;
  display: inline-flex;
  flex-direction: column;
  gap: 0.6rem;
  text-align: left;
}
.trial-features li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
}
.trial-features .check {
  color: var(--gold);
  font-weight: 700;
}
.trial-footer {
  margin-top: 1rem;
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>
