<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import LockedFeatureCard from '../components/LockedFeatureCard.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { useAuth } from '../composables/useAuth';
import { billingService } from '../lib';
import { ApiClientError } from '../lib/apiClient';
import { track } from '../lib/analytics';
import { captureFrontendException } from '../lib/errorTracking';

const { t } = useI18n();
const { user } = useAuth();
const checkoutLoading = ref(false);
const checkoutError = ref<string | null>(null);

const isPremium = computed(() => Boolean(user.value?.isPremium));

async function goPremium() {
  checkoutError.value = null;
  checkoutLoading.value = true;
  track('checkout_started', { channel: 'web' });
  try {
    const { url } = await billingService.createPremiumCheckoutSession();
    window.location.href = url;
  } catch (e) {
    checkoutError.value =
      e instanceof ApiClientError ? e.message : (e as Error).message ?? t('premium.checkoutFailed');
    captureFrontendException(e, { billing: { flow: 'create_checkout_session' } });
  } finally {
    checkoutLoading.value = false;
  }
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
        <p v-if="checkoutError" class="checkout-error" role="alert">{{ checkoutError }}</p>
        <button
          type="button"
          class="btn-celestial go-premium"
          :disabled="checkoutLoading"
          @click="goPremium"
        >
          {{ checkoutLoading ? t('premium.checkoutLoading') : t('premium.goPremium') }}
        </button>
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
</style>
