<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { useDocumentMeta } from '../composables/useDocumentMeta';
import { getZodiacInfo, ZODIAC_SIGNS } from '../lib/zodiac';
import type { ZodiacSign } from '../lib/types';

const route = useRoute();

function normalizeSign(value: unknown): ZodiacSign {
  const slug = String(value ?? '').toLowerCase();
  return ZODIAC_SIGNS.some((sign) => sign.key === slug) ? (slug as ZodiacSign) : 'aries';
}

const sign1 = computed(() => normalizeSign(route.params.sign1));
const sign2 = computed(() => normalizeSign(route.params.sign2));
const info1 = computed(() => getZodiacInfo(sign1.value));
const info2 = computed(() => getZodiacInfo(sign2.value));
const title = computed(() => `${info1.value.name} and ${info2.value.name} Compatibility | Astralis`);
const description = computed(
  () =>
    `Explore ${info1.value.name} and ${info2.value.name} zodiac compatibility for love, friendship, communication, and emotional timing.`,
);

useDocumentMeta({
  title: title.value,
  description: description.value,
  canonicalPath: `/compatibility/${sign1.value}/${sign2.value}`,
  type: 'article',
});
</script>

<template>
  <AppContainer size="lg">
    <ScreenLayout class="compat-static-page">
      <article class="hero glass-card">
        <p class="kicker">Zodiac compatibility</p>
        <h1>{{ info1.name }} and {{ info2.name }} Compatibility</h1>
        <p>{{ description }}</p>
      </article>

      <section class="grid">
        <article class="glass-card">
          <h2>Love</h2>
          <p>{{ info1.name }} and {{ info2.name }} can build connection by honoring each sign's rhythm and needs.</p>
        </article>
        <article class="glass-card">
          <h2>Friendship</h2>
          <p>Shared curiosity, boundaries, and emotional timing shape how this pair keeps trust alive.</p>
        </article>
        <article class="glass-card">
          <h2>Communication</h2>
          <p>Clear language matters most when the signs approach conflict, planning, or affection differently.</p>
        </article>
      </section>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.compat-static-page {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-7) 0;
}
.hero,
.grid article {
  padding: clamp(1.25rem, 4vw, 2.5rem);
}
.kicker {
  color: var(--gold-light);
  font-size: var(--text-xs);
  letter-spacing: 1.6px;
  text-transform: uppercase;
}
h1,
h2 {
  font-family: var(--font-display);
  color: var(--text-primary);
}
h1 {
  font-size: clamp(2.2rem, 8vw, 4.5rem);
  line-height: 1;
}
p {
  color: var(--text-secondary);
  max-width: 72ch;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}
@media (max-width: 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
