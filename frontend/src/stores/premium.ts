import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { billingMobileService, billingService } from '../lib';
import { ApiClientError } from '../lib/apiClient';
import { track } from '../lib/analytics';
import { captureFrontendException } from '../lib/errorTracking';
import { useAuthStore } from './auth';

export const usePremiumStore = defineStore('premium', () => {
  const checkoutLoading = ref(false);
  const syncLoading = ref(false);
  const error = ref<string | null>(null);
  const auth = useAuthStore();

  const isPremium = computed(() => Boolean(auth.user?.isPremium));

  async function startCheckout(fallbackMessage: string): Promise<string | null> {
    error.value = null;
    checkoutLoading.value = true;
    track('checkout_started', { channel: 'web' });
    try {
      const { url } = await billingService.createPremiumCheckoutSession();
      return url;
    } catch (err) {
      error.value =
        err instanceof ApiClientError ? err.message : (err as Error).message ?? fallbackMessage;
      captureFrontendException(err, { billing: { flow: 'create_checkout_session' } });
      return null;
    } finally {
      checkoutLoading.value = false;
    }
  }

  async function syncCheckoutSession(sessionId: string | null | undefined): Promise<void> {
    syncLoading.value = true;
    error.value = null;
    try {
      if (sessionId) {
        await billingService.syncPremiumCheckoutSession(sessionId);
        track('premium_purchased', { source: 'checkout_sync' });
      }
      await auth.refreshUser();
    } catch (err) {
      error.value = (err as Error).message;
      captureFrontendException(err, { billing: { flow: 'premium_success_sync' } });
      throw err;
    } finally {
      syncLoading.value = false;
    }
  }

  async function restorePremiumStatus(): Promise<boolean> {
    syncLoading.value = true;
    error.value = null;
    try {
      const result = await billingMobileService.restoreMobilePremiumStatus();
      await auth.refreshUser();
      return result.isPremium;
    } catch (err) {
      error.value = (err as Error).message;
      captureFrontendException(err, { billing: { flow: 'premium_restore' } });
      throw err;
    } finally {
      syncLoading.value = false;
    }
  }

  return {
    checkoutLoading,
    syncLoading,
    error,
    isPremium,
    startCheckout,
    syncCheckoutSession,
    restorePremiumStatus,
  };
});
