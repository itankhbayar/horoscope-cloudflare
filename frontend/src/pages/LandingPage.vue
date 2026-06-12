<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { useDocumentMeta } from '../composables/useDocumentMeta';

const { t } = useI18n();

const differenceCards = computed(() => [
  { title: t('landing.different.real.title'), body: t('landing.different.real.body') },
  { title: t('landing.different.birthplace.title'), body: t('landing.different.birthplace.body') },
  { title: t('landing.different.calm.title'), body: t('landing.different.calm.body') },
  { title: t('landing.different.mongolia.title'), body: t('landing.different.mongolia.body') },
]);

const skyItems = computed(() => [
  { label: t('landing.todaySky.sun.label'), body: t('landing.todaySky.sun.body') },
  { label: t('landing.todaySky.moon.label'), body: t('landing.todaySky.moon.body') },
  { label: t('landing.todaySky.phase.label'), body: t('landing.todaySky.phase.body') },
  { label: t('landing.todaySky.transits.label'), body: t('landing.todaySky.transits.body') },
]);

useDocumentMeta({
  title: t('landing.seoTitle'),
  description: t('landing.seoDescription'),
  canonicalPath: '/welcome',
  type: 'website',
});
</script>

<template>
  <AppContainer size="xl">
    <ScreenLayout class="landing-page">
      <section class="hero" aria-labelledby="landing-title">
        <div class="hero-copy">
          <p class="kicker">{{ t('landing.heroKicker') }}</p>
          <h1 id="landing-title">{{ t('landing.heroTitle') }}</h1>
          <p class="hero-subtitle">{{ t('landing.heroSubtitle') }}</p>
          <div class="hero-actions">
            <router-link to="/register" class="primary-cta">{{ t('landing.ctaPrimary') }}</router-link>
            <router-link to="/horoscope/aries/today" class="secondary-cta">{{ t('landing.ctaSecondary') }}</router-link>
          </div>
        </div>

        <aside class="sky-preview" aria-label="Astralis real sky preview">
          <p class="preview-kicker">{{ t('landing.preview.kicker') }}</p>
          <div class="preview-orbit" aria-hidden="true">
            <span class="preview-sun" />
            <span class="preview-moon" />
            <span class="preview-line" />
          </div>
          <dl class="preview-list">
            <div>
              <dt>{{ t('landing.preview.sun') }}</dt>
              <dd>{{ t('landing.preview.sunValue') }}</dd>
            </div>
            <div>
              <dt>{{ t('landing.preview.moon') }}</dt>
              <dd>{{ t('landing.preview.moonValue') }}</dd>
            </div>
            <div>
              <dt>{{ t('landing.preview.phase') }}</dt>
              <dd>{{ t('landing.preview.phaseValue') }}</dd>
            </div>
          </dl>
          <p class="preview-note">{{ t('landing.preview.note') }}</p>
        </aside>
      </section>

      <section class="section" aria-labelledby="different-title">
        <p class="kicker">{{ t('landing.different.kicker') }}</p>
        <h2 id="different-title">{{ t('landing.different.title') }}</h2>
        <div class="feature-grid">
          <article v-for="card in differenceCards" :key="card.title" class="feature-card">
            <h3>{{ card.title }}</h3>
            <p>{{ card.body }}</p>
          </article>
        </div>
      </section>

      <section class="section split" aria-labelledby="today-sky-title">
        <div>
          <p class="kicker">{{ t('landing.todaySky.kicker') }}</p>
          <h2 id="today-sky-title">{{ t('landing.todaySky.title') }}</h2>
          <p>{{ t('landing.todaySky.body') }}</p>
        </div>
        <div class="sky-list">
          <article v-for="item in skyItems" :key="item.label" class="sky-item">
            <h3>{{ item.label }}</h3>
            <p>{{ item.body }}</p>
          </article>
        </div>
      </section>

      <section class="section birthplace" aria-labelledby="birthplace-title">
        <p class="kicker">{{ t('landing.birthplace.kicker') }}</p>
        <h2 id="birthplace-title">{{ t('landing.birthplace.title') }}</h2>
        <p>{{ t('landing.birthplace.body') }}</p>
      </section>

      <section class="section split" aria-labelledby="sample-title">
        <div>
          <p class="kicker">{{ t('landing.sample.kicker') }}</p>
          <h2 id="sample-title">{{ t('landing.sample.title') }}</h2>
          <p>{{ t('landing.sample.body') }}</p>
        </div>
        <blockquote class="sample-card">
          <p>{{ t('landing.sample.quote') }}</p>
        </blockquote>
      </section>

      <section class="section" aria-labelledby="preview-title">
        <p class="kicker">{{ t('landing.mobilePreview.kicker') }}</p>
        <h2 id="preview-title">{{ t('landing.mobilePreview.title') }}</h2>
        <div class="phone-grid">
          <article class="phone-card">
            <span>{{ t('landing.mobilePreview.today.label') }}</span>
            <h3>{{ t('landing.mobilePreview.today.title') }}</h3>
            <p>{{ t('landing.mobilePreview.today.body') }}</p>
          </article>
          <article class="phone-card">
            <span>{{ t('landing.mobilePreview.why.label') }}</span>
            <h3>{{ t('landing.mobilePreview.why.title') }}</h3>
            <p>{{ t('landing.mobilePreview.why.body') }}</p>
          </article>
          <article class="phone-card">
            <span>{{ t('landing.mobilePreview.reveal.label') }}</span>
            <h3>{{ t('landing.mobilePreview.reveal.title') }}</h3>
            <p>{{ t('landing.mobilePreview.reveal.body') }}</p>
          </article>
        </div>
      </section>

      <section class="section origin" aria-labelledby="origin-title">
        <p class="kicker">{{ t('landing.origin.kicker') }}</p>
        <h2 id="origin-title">{{ t('landing.origin.title') }}</h2>
        <p>{{ t('landing.origin.body') }}</p>
      </section>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.landing-page {
  gap: clamp(2.2rem, 6vw, 5rem);
}
.hero {
  min-height: min(760px, calc(100vh - 7rem));
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(300px, 0.74fr);
  align-items: center;
  gap: clamp(2rem, 5vw, 4rem);
  padding-block: clamp(2rem, 6vw, 5rem);
}
.kicker,
.preview-kicker {
  color: var(--gold-light);
  font-size: var(--text-xs);
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
}
h1,
h2,
h3 {
  color: var(--text-primary);
  font-family: var(--font-display);
}
h1 {
  max-width: 11ch;
  margin: var(--space-2) 0 var(--space-4);
  font-size: clamp(3.4rem, 10vw, 7.5rem);
  line-height: 0.92;
}
h2 {
  max-width: 12ch;
  margin: var(--space-2) 0 var(--space-3);
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1;
}
h3 {
  margin: 0 0 var(--space-2);
  font-size: clamp(1.05rem, 2.4vw, 1.4rem);
}
p {
  color: var(--text-secondary);
  line-height: 1.7;
}
.hero-subtitle {
  max-width: 62ch;
  font-size: clamp(1.03rem, 2vw, 1.22rem);
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-5);
}
.primary-cta,
.secondary-cta {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 var(--space-5);
  text-decoration: none;
  font-weight: 800;
}
.primary-cta {
  color: #111225;
  background: var(--gold);
}
.secondary-cta {
  color: var(--text-primary);
  border: 1px solid var(--glass-border-hover);
  background: rgba(255, 255, 255, 0.04);
}
.sky-preview,
.feature-card,
.sky-item,
.sample-card,
.phone-card,
.birthplace,
.origin {
  border: 1px solid var(--glass-border);
  border-radius: 22px;
  background: rgba(18, 20, 42, 0.68);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
}
.sky-preview {
  padding: clamp(1.2rem, 3vw, 2rem);
}
.preview-orbit {
  position: relative;
  width: min(100%, 320px);
  aspect-ratio: 1;
  margin: var(--space-4) auto;
  border: 1px solid rgba(212, 175, 55, 0.28);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.14), rgba(139, 107, 255, 0.1) 46%, rgba(255, 255, 255, 0.02));
}
.preview-sun,
.preview-moon,
.preview-line {
  position: absolute;
  border-radius: 999px;
}
.preview-sun {
  width: 58px;
  aspect-ratio: 1;
  left: calc(50% - 29px);
  top: calc(50% - 29px);
  background: var(--gold);
  box-shadow: 0 0 38px rgba(212, 175, 55, 0.35);
}
.preview-moon {
  width: 26px;
  aspect-ratio: 1;
  right: 18%;
  top: 24%;
  border: 2px solid #dfe5ff;
}
.preview-line {
  left: 12%;
  right: 12%;
  bottom: 26%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(223, 229, 255, 0.58), transparent);
}
.preview-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
}
.preview-list div {
  min-width: 0;
  border-radius: 14px;
  padding: var(--space-3);
  background: rgba(255, 255, 255, 0.055);
}
.preview-list dt {
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}
.preview-list dd {
  margin: var(--space-1) 0 0;
  color: var(--text-primary);
  font-weight: 800;
}
.preview-note {
  margin-bottom: 0;
  font-size: var(--text-sm);
}
.section {
  display: grid;
  gap: var(--space-4);
}
.feature-grid,
.phone-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}
.feature-card,
.sky-item,
.phone-card {
  padding: clamp(1.1rem, 3vw, 1.55rem);
}
.split {
  grid-template-columns: minmax(0, 0.78fr) minmax(0, 1fr);
  align-items: start;
  gap: clamp(1.5rem, 5vw, 3rem);
}
.sky-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
.birthplace,
.origin {
  padding: clamp(1.4rem, 4vw, 2.4rem);
}
.birthplace h2,
.origin h2 {
  max-width: 18ch;
}
.sample-card {
  margin: 0;
  padding: clamp(1.3rem, 4vw, 2rem);
}
.sample-card p {
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: clamp(1.25rem, 3vw, 1.8rem);
  line-height: 1.45;
}
.phone-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.phone-card {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
    rgba(18, 20, 42, 0.7);
}
.phone-card span {
  color: var(--gold-light);
  font-size: var(--text-xs);
  font-weight: 800;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
.phone-card p {
  margin-bottom: 0;
}
@media (max-width: 900px) {
  .hero,
  .split {
    grid-template-columns: 1fr;
  }
  h1,
  h2 {
    max-width: 14ch;
  }
  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .feature-grid,
  .sky-list,
  .phone-grid,
  .preview-list {
    grid-template-columns: 1fr;
  }
  .hero {
    min-height: auto;
  }
}
</style>
