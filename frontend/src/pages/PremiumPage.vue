<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import LockedFeatureCard from '../components/LockedFeatureCard.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { usePremiumStore } from '../stores/premium';
import { useAuth } from '../composables/useAuth';
import { track, PAYWALL_CTA_EVENT } from '../lib/analytics';

const { t } = useI18n();
const router = useRouter();
const { isAuthenticated } = useAuth();
const premiumStore = usePremiumStore();
const { checkoutLoading, syncLoading, error: checkoutError, isPremium } = storeToRefs(premiumStore);

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
  // Checkout needs an account, so a guest tapping the trial CTA is routed to sign-up
  // and returned to /premium afterwards to finish starting their trial.
  if (!isAuthenticated.value) {
    track(PAYWALL_CTA_EVENT, { source: 'premium_page', hasTrial: true, guest: true });
    void router.push({ name: 'register', query: { redirect: '/premium' } });
    return;
  }
  // CTA tap only. The real `trial_started` is emitted by the Stripe webhook once the
  // subscription is confirmed `trialing`, so we never double-count from the client.
  track(PAYWALL_CTA_EVENT, { source: 'premium_page', hasTrial: true });
  const url = await premiumStore.startCheckout(t('premium.checkoutFailed'));
  if (url) window.location.href = url;
}

async function refreshPremiumStatus() {
  if (!isAuthenticated.value) {
    void router.push({ name: 'login', query: { redirect: '/premium' } });
    return;
  }
  await premiumStore.restorePremiumStatus();
}

const easternPoints = computed(() => [
  t('premium.eastern.point1'),
  t('premium.eastern.point2'),
  t('premium.eastern.point3'),
]);

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
        @unlock="goPremium"
      />
    </section>

    <section class="eastern glass-card">
      <div class="eastern-head">
        <span class="eastern-glyph" aria-hidden="true">☯</span>
        <h2>{{ t('premium.eastern.title') }}</h2>
      </div>
      <p class="eastern-body">{{ t('premium.eastern.body') }}</p>
      <ul class="eastern-points">
        <li v-for="point in easternPoints" :key="point">
          <span class="check" aria-hidden="true">✓</span>{{ point }}
        </li>
      </ul>
      <p class="eastern-foot">{{ t('premium.eastern.footer') }}</p>
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
        <button
          type="button"
          class="restore-btn"
          :disabled="syncLoading"
          @click="refreshPremiumStatus"
        >
          {{ syncLoading ? t('premium.syncing') : t('premium.refreshStatus') }}
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
/* Keep the three Unlock Premium cards on a single row, tightening the gap on
   narrow screens so they stay side by side instead of stacking. */
@media (max-width: 800px) { .features-grid { gap: 0.6rem; } }
.eastern {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-left: 3px solid var(--gold);
}
.eastern-head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.eastern-glyph {
  display: inline-grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  background: rgba(212, 175, 55, 0.09);
  color: var(--gold-light);
  font-size: 1.2rem;
}
.eastern-head h2 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  margin: 0;
}
.eastern-body {
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
  max-width: 60ch;
}
.eastern-points {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.eastern-points li {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
}
.eastern-points .check {
  color: var(--gold);
  font-weight: 700;
  flex-shrink: 0;
}
.eastern-foot {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}
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
  display: block;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}
.restore-btn {
  display: block;
  margin: 0.9rem auto 0;
  background: transparent;
  border: 0;
  color: var(--gold-light);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}
.restore-btn:disabled {
  cursor: wait;
  opacity: 0.7;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  text-align: center;
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

/* Compact the locked feature cards so all three fit on one row on phones. */
@media (max-width: 800px) {
  .features-grid :deep(.locked-card) {
    padding: 1rem 0.6rem 1.1rem;
    min-height: 0;
  }
  .features-grid :deep(.locked-card .icon) {
    font-size: 1.7rem;
  }
  .features-grid :deep(.locked-card h3) {
    font-size: 0.92rem;
  }
  .features-grid :deep(.locked-card p) {
    font-size: 0.74rem;
    line-height: 1.45;
  }
  .features-grid :deep(.lock-overlay) {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.2rem 0.4rem;
    font-size: 0.55rem;
  }
  .features-grid :deep(.lock-overlay .lock-icon) {
    display: none;
  }
  .features-grid :deep(.upgrade-btn) {
    padding: 0.5rem 0.7rem;
    font-size: 0.68rem;
    letter-spacing: 0.5px;
  }
}
</style>
