<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { useAuth } from '../composables/useAuth';
import { billingService } from '../lib';
import { track } from '../lib/analytics';
import { captureFrontendException } from '../lib/errorTracking';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { refreshUser } = useAuth();
const error = ref<string | null>(null);
const syncing = ref(true);

onMounted(async () => {
  try {
    const sessionId = Array.isArray(route.query.session_id)
      ? route.query.session_id[0]
      : route.query.session_id;
    if (sessionId) {
      await billingService.syncPremiumCheckoutSession(sessionId);
      track('premium_purchased', { source: 'checkout_sync' });
    }
    await refreshUser();
  } catch (e) {
    error.value = (e as Error).message ?? t('premium.syncError');
    captureFrontendException(e, { billing: { flow: 'premium_success_sync' } });
  } finally {
    syncing.value = false;
  }
});

function goHome() {
  router.push({ name: 'home' });
}
</script>

<template>
  <AppContainer size="md">
    <ScreenLayout class="premium-result">
      <h1>{{ t('premium.successTitle') }}</h1>
      <p v-if="syncing" class="muted">{{ t('premium.syncing') }}</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else class="muted">{{ t('premium.successBody') }}</p>
      <button type="button" class="btn-celestial" :disabled="syncing" @click="goHome">
        {{ t('premium.backHome') }}
      </button>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.premium-result {
  text-align: center;
  gap: 1.25rem;
  padding: 2rem 0;
}
h1 {
  font-family: var(--font-display);
  font-size: 1.75rem;
}
.muted {
  color: var(--text-muted);
}
.error {
  color: var(--danger, #e57373);
}
</style>
