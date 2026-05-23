<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useConsentStore } from '../stores/consent';

const consent = useConsentStore();
const { expanded, hasChoice } = storeToRefs(consent);

onMounted(consent.hydrate);
</script>

<template>
  <aside
    v-if="expanded"
    class="privacy-banner"
    role="dialog"
    aria-live="polite"
    aria-label="Privacy preferences"
  >
    <div>
      <p class="privacy-title">Privacy preferences</p>
      <p class="privacy-copy">
        Astralis uses optional analytics to understand app usage and improve horoscope, compatibility,
        and billing flows. We do not send birth time, birth location, chart placements, passwords, or
        payment details to analytics.
        <router-link to="/privacy">Read the Privacy Policy</router-link>.
      </p>
    </div>
    <div class="privacy-actions">
      <button type="button" class="secondary" @click="consent.declineAnalytics">Decline analytics</button>
      <button type="button" class="primary" @click="consent.acceptAnalytics">Allow analytics</button>
    </div>
  </aside>

  <button
    v-else-if="hasChoice"
    type="button"
    class="privacy-pill"
    aria-label="Update privacy preferences"
    @click="consent.openPreferences"
  >
    Privacy
  </button>
</template>

<style scoped>
.privacy-banner {
  position: fixed;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  z-index: 800;
  width: min(760px, calc(100% - 2rem));
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border: 1px solid var(--glass-border-hover);
  border-radius: var(--radius-md);
  background: rgba(12, 10, 28, 0.96);
  box-shadow: var(--shadow-lg);
}
.privacy-title {
  margin: 0 0 0.25rem;
  color: var(--text-primary);
  font-weight: 700;
}
.privacy-copy {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.45;
}
a {
  color: var(--gold-light);
}
.privacy-actions {
  display: flex;
  gap: 0.5rem;
}
button {
  min-height: 42px;
  border-radius: var(--radius-sm);
  padding: 0 0.85rem;
  cursor: pointer;
}
.primary {
  border: 1px solid var(--gold);
  background: var(--gold);
  color: #1f1300;
  font-weight: 700;
}
.secondary {
  border: 1px solid var(--glass-border-hover);
  background: transparent;
  color: var(--text-secondary);
}
.privacy-pill {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 760;
  border: 1px solid var(--glass-border-hover);
  background: rgba(12, 10, 28, 0.82);
  color: var(--text-secondary);
}
@media (max-width: 720px) {
  .privacy-banner {
    grid-template-columns: 1fr;
  }
  .privacy-actions {
    flex-direction: column-reverse;
  }
}
</style>
