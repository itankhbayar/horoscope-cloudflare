<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import LockedFeatureCard from '../components/LockedFeatureCard.vue';

const { t } = useI18n();

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
</script>

<template>
  <div class="premium-page">
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
      <h2>{{ t('premium.comingSoon') }}</h2>
      <p>{{ t('premium.comingSoonBody') }}</p>
      <button class="btn-celestial" disabled>{{ t('premium.notifyMe') }}</button>
    </section>
  </div>
</template>

<style scoped>
.premium-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
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
.cta .btn-celestial {
  max-width: 320px;
  margin: 0 auto;
  opacity: 0.75;
  cursor: not-allowed;
}
</style>
