<script setup lang="ts">
import { computed } from 'vue';
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useConsentStore } from '../stores/consent';

const consent = useConsentStore();
const { expanded, hasChoice } = storeToRefs(consent);
const { locale } = useI18n();

const isMn = computed(() => locale.value.startsWith('mn'));
const copy = computed(() =>
  isMn.value
    ? {
        label: 'Нууцлалын сонголт',
        title: 'Нууцлалын сонголт',
        body:
          'Astralis нь аппын хэрэглээ, зурхай, нийцэл болон төлбөрийн урсгалыг сайжруулахын тулд зөвхөн таны зөвшөөрсөн үед нэмэлт аналитик ашиглана. Бид төрсөн цаг, төрсөн газар, чартын байрлал, нууц үг, төлбөрийн мэдээллийг аналитик руу илгээдэггүй.',
        link: 'Нууцлалын бодлогыг унших',
        decline: 'Аналитикаас татгалзах',
        allow: 'Аналитик зөвшөөрөх',
        update: 'Нууцлалын сонголтоо өөрчлөх',
        pill: 'Нууцлал',
      }
    : {
        label: 'Privacy preferences',
        title: 'Privacy preferences',
        body:
          'Astralis uses optional analytics to understand app usage and improve horoscope, compatibility, and billing flows. We do not send birth time, birth location, chart placements, passwords, or payment details to analytics.',
        link: 'Read the Privacy Policy',
        decline: 'Decline analytics',
        allow: 'Allow analytics',
        update: 'Update privacy preferences',
        pill: 'Privacy',
      },
);

onMounted(consent.hydrate);
</script>

<template>
  <aside
    v-if="expanded"
    class="privacy-banner"
    role="dialog"
    aria-live="polite"
    :aria-label="copy.label"
  >
    <div>
      <p class="privacy-title">{{ copy.title }}</p>
      <p class="privacy-copy">
        {{ copy.body }}
        <router-link to="/privacy">{{ copy.link }}</router-link>.
      </p>
    </div>
    <div class="privacy-actions">
      <button type="button" class="secondary" @click="consent.declineAnalytics">{{ copy.decline }}</button>
      <button type="button" class="primary" @click="consent.acceptAnalytics">{{ copy.allow }}</button>
    </div>
  </aside>

  <button
    v-else-if="hasChoice"
    type="button"
    class="privacy-pill"
    :aria-label="copy.update"
    @click="consent.openPreferences"
  >
    {{ copy.pill }}
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
