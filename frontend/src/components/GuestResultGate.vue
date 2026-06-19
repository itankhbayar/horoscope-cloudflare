<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  /** Optional override for the headline so each feature can speak to its own result. */
  message?: string;
}>();

const route = useRoute();
const { t } = useI18n();

// Bring the guest back to this exact feature once they finish signing in / up.
const redirect = computed(() => route.fullPath);
const headline = computed(() => props.message ?? t('guestGate.message'));
</script>

<template>
  <section class="guest-gate glass-card" role="note" aria-live="polite">
    <span class="gate-icon" aria-hidden="true">🔒</span>
    <h3 class="gate-title">{{ headline }}</h3>
    <p class="gate-note">{{ t('guestGate.premiumNote') }}</p>
    <div class="gate-actions">
      <router-link class="btn-celestial gate-primary" :to="{ name: 'register', query: { redirect } }">
        {{ t('guestGate.createAccount') }}
      </router-link>
      <router-link class="gate-secondary" :to="{ name: 'login', query: { redirect } }">
        {{ t('guestGate.signIn') }}
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.guest-gate {
  padding: 2rem 1.6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.7rem;
}
.gate-icon {
  font-size: 1.8rem;
  filter: drop-shadow(0 0 14px var(--gold-glow));
}
.gate-title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  color: var(--text-primary);
  margin: 0;
}
.gate-note {
  color: var(--text-secondary);
  font-size: 0.92rem;
  max-width: 460px;
  margin: 0;
  line-height: 1.6;
}
.gate-actions {
  margin-top: 0.6rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}
.gate-primary {
  text-decoration: none;
  padding: 0.7rem 1.6rem;
}
.gate-secondary {
  color: var(--gold-light);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
}
.gate-secondary:hover {
  text-decoration: underline;
}
</style>
