import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  readPrivacyConsent,
  savePrivacyConsent,
  type PrivacyConsent,
} from '../lib/privacyConsent';
import { track } from '../lib/analytics';

export const useConsentStore = defineStore('consent', () => {
  const current = ref<PrivacyConsent | null>(null);
  const expanded = ref(false);

  const hasChoice = computed(() => current.value !== null);
  const analyticsAllowed = computed(() => current.value?.analytics === true);

  function hydrate(): void {
    current.value = readPrivacyConsent();
    expanded.value = current.value === null;
  }

  function acceptAnalytics(): void {
    current.value = savePrivacyConsent(true);
    track('app_open', { consent: 'granted' });
    expanded.value = false;
  }

  function declineAnalytics(): void {
    current.value = savePrivacyConsent(false);
    expanded.value = false;
  }

  function openPreferences(): void {
    expanded.value = true;
  }

  return {
    current,
    expanded,
    hasChoice,
    analyticsAllowed,
    hydrate,
    acceptAnalytics,
    declineAnalytics,
    openPreferences,
  };
});
