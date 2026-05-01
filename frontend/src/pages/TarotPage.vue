<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ZODIAC_SIGNS } from '../lib/zodiac';
import type { ZodiacSign } from '../lib/types';
import { useTarot } from '../composables/useTarot';
import { useProfile } from '../composables/useProfile';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const { t, locale } = useI18n();
const { profile, load: loadProfile } = useProfile();
const { loading, error, empty, data, load, reset, hasReading } = useTarot();

const showIdlePanel = computed(
  () => !loading.value && !error.value && !empty.value && data.value === null,
);

const BASE_TZ = [
  'Asia/Ulaanbaatar',
  'UTC',
  'America/New_York',
  'Europe/London',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const;

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

function localTodayPicker(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const timezoneOptions = computed(() => {
  const b = browserTimeZone();
  const set = new Set<string>([b, ...BASE_TZ]);
  return [...set];
});

const selectedSign = ref<ZodiacSign>('leo');
const timezone = ref(browserTimeZone());
const dateStr = ref(localTodayPicker());

const sunSign = computed(() => profile.value?.natalChart?.sunSign ?? null);

const matchesProfileSun = computed(
  () => Boolean(sunSign.value && selectedSign.value === sunSign.value),
);

const displayDateLabel = computed(() => {
  const parts = dateStr.value.split('-').map((x) => Number.parseInt(x, 10));
  const [y, m, d] = parts;
  if (!y || !m || !d) return dateStr.value;
  const dt = new Date(y, m - 1, d);
  const loc = locale.value === 'mn' ? 'mn-MN' : 'en-US';
  try {
    return new Intl.DateTimeFormat(loc, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(dt);
  } catch {
    return dateStr.value;
  }
});

onMounted(async () => {
  await loadProfile();
  if (sunSign.value) selectedSign.value = sunSign.value;
});

async function reveal(): Promise<void> {
  await load({
    sign: selectedSign.value,
    timezone: timezone.value,
    date: dateStr.value,
    lang: locale.value,
  });
}

watch([() => selectedSign.value, () => timezone.value, () => dateStr.value], () => {
  reset();
});

watch(locale, async () => {
  if (hasReading.value) await reveal();
});

function arcanaLabel(v: 'Major' | 'Minor'): string {
  return v === 'Major' ? t('tarot.major') : t('tarot.minor');
}

function orientationLabel(v: 'Upright' | 'Reversed'): string {
  return v === 'Upright' ? t('tarot.upright') : t('tarot.reversed');
}

</script>

<template>
  <div class="tarot-page">
    <header class="hero">
      <h1 class="title">{{ t('tarot.title') }}</h1>
      <p class="subtitle">{{ t('tarot.subtitle') }}</p>
    </header>

    <section v-if="showIdlePanel" class="idle-panel glass-card" aria-labelledby="tarot-idle-title">
      <div class="idle-layout">
        <div class="idle-visual" aria-hidden="true">
          <span class="deck-card c1" />
          <span class="deck-card c2" />
          <span class="deck-card c3" />
        </div>
        <div class="idle-copy">
          <h2 id="tarot-idle-title" class="idle-title">{{ t('tarot.beforeTitle') }}</h2>
          <p class="idle-intro">{{ t('tarot.beforeIntro') }}</p>
          <ol class="idle-steps">
            <li>{{ t('tarot.beforeStep1') }}</li>
            <li>{{ t('tarot.beforeStep2') }}</li>
            <li>{{ t('tarot.beforeStep3') }}</li>
          </ol>
        </div>
      </div>
      <div class="selection-preview">
        <span class="preview-label">{{ t('tarot.selectionTitle') }}</span>
        <div class="preview-chips">
          <span class="preview-chip">{{ t(`zodiac.${selectedSign}`) }}</span>
          <span class="preview-chip">{{ displayDateLabel }}</span>
          <span class="preview-chip">{{ timezone }}</span>
        </div>
      </div>
    </section>

    <form class="controls glass-card" @submit.prevent="reveal">
      <div class="field">
        <label class="label" id="tarot-sign-label">{{ t('tarot.signLabel') }}</label>
        <p v-if="matchesProfileSun" class="profile-hint" role="status">
          {{ t('tarot.profileSunHint') }}
        </p>
        <div class="sign-grid" role="group" aria-labelledby="tarot-sign-label">
          <button
            v-for="s in ZODIAC_SIGNS"
            :key="s.key"
            type="button"
            class="sign-pill"
            :class="{ active: selectedSign === s.key }"
            :aria-pressed="selectedSign === s.key"
            @click="selectedSign = s.key"
          >
            <span class="sym" aria-hidden="true">{{ s.symbol }}</span>
            <span class="nm">{{ t(`zodiac.${s.key}`) }}</span>
          </button>
        </div>
      </div>
      <div class="row-2">
        <div class="field grow">
          <label class="label" for="tz">{{ t('tarot.timezoneLabel') }}</label>
          <select id="tz" v-model="timezone" class="input-like">
            <option v-for="tz in timezoneOptions" :key="tz" :value="tz">{{ tz }}</option>
          </select>
        </div>
        <div class="field">
          <label class="label" for="dt">{{ t('tarot.dateLabel') }}</label>
          <input id="dt" v-model="dateStr" type="date" class="input-like" />
        </div>
      </div>
      <button
        type="submit"
        class="primary-btn"
        :disabled="loading"
        :aria-busy="loading"
      >
        {{ loading ? t('tarot.drawLoading') : t('tarot.draw') }}
      </button>
    </form>

    <section v-if="loading" class="state-block" role="status" aria-live="polite">
      <LoadingSpinner />
      <p class="state-text">{{ t('tarot.loading') }}</p>
    </section>

    <section v-else-if="error" class="state-block glass-card error-card" role="alert">
      <p class="state-title">{{ t('tarot.errorTitle') }}</p>
      <p class="state-text">{{ error }}</p>
    </section>

    <section v-else-if="empty" class="state-block glass-card">
      <p class="state-title">{{ t('tarot.emptyTitle') }}</p>
      <p class="state-text">{{ t('tarot.emptyHint') }}</p>
    </section>

    <section v-else-if="data" class="reading">
      <div class="chips-row">
        <span class="chip">{{ t('tarot.energy') }}: {{ data.energyScore }}</span>
        <span class="chip source">{{ t('tarot.fromCache') }}</span>
      </div>

      <article class="card-block glass-card">
        <h2 class="block-title">{{ t('tarot.cardTitle') }}</h2>
        <p class="card-name">{{ data.card_of_the_day.name }}</p>
        <div class="meta-row">
          <span>{{ t('tarot.arcana') }}: {{ arcanaLabel(data.card_of_the_day.arcana) }}</span>
          <span>{{ t('tarot.orientation') }}: {{ orientationLabel(data.card_of_the_day.orientation) }}</span>
        </div>
        <p class="core">{{ data.card_of_the_day.core_meaning }}</p>
      </article>

      <article class="sections glass-card">
        <h2 class="block-title">{{ t('tarot.sections') }}</h2>
        <div class="sec">
          <h3>{{ t('tarot.overview') }}</h3>
          <p>{{ data.reading.overview }}</p>
        </div>
        <div class="sec">
          <h3>{{ t('tarot.love') }}</h3>
          <p>{{ data.reading.love }}</p>
        </div>
        <div class="sec">
          <h3>{{ t('tarot.career') }}</h3>
          <p>{{ data.reading.career }}</p>
        </div>
        <div class="sec">
          <h3>{{ t('tarot.energyNarrative') }}</h3>
          <p>{{ data.reading.energy }}</p>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.tarot-page {
  max-width: 820px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 4rem;
}
.hero {
  text-align: center;
  margin-bottom: 1.75rem;
}
.title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 1px;
  margin: 0 0 0.35rem;
}
.subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin: 0;
}
.controls {
  padding: 1.25rem 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1.75rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.field.grow {
  flex: 1;
  min-width: 0;
}
.label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-muted);
}
.sign-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
@media (min-width: 560px) {
  .sign-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
.sign-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0.45rem 0.25rem;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-secondary);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.65rem;
  transition: border-color 0.2s, background 0.2s, color 0.2s;
}
.sign-pill .sym {
  font-size: 1rem;
  color: var(--gold-dim);
}
.sign-pill.active {
  border-color: var(--glass-border-hover);
  background: var(--gold-glow);
  color: var(--text-primary);
}
.sign-pill.active .sym {
  color: var(--gold);
}
.sign-pill .nm {
  line-height: 1.1;
  text-align: center;
}
.row-2 {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
@media (min-width: 560px) {
  .row-2 {
    flex-direction: row;
    align-items: flex-end;
  }
}
.input-like {
  width: 100%;
  padding: 0.55rem 0.65rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 0.9rem;
}
.profile-hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--gold-light);
  letter-spacing: 0.02em;
}
.primary-btn {
  align-self: stretch;
  padding: 0.7rem 1.4rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: linear-gradient(135deg, rgba(201, 168, 76, 0.25), rgba(201, 168, 76, 0.08));
  color: var(--gold-light);
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: opacity 0.2s, transform 0.15s;
}
@media (min-width: 560px) {
  .primary-btn {
    align-self: flex-start;
    min-width: 11rem;
  }
}
.primary-btn:not(:disabled):hover {
  border-color: var(--glass-border-hover);
}
.primary-btn:not(:disabled):active {
  transform: scale(0.98);
}
.primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.idle-panel {
  padding: 1.35rem 1.25rem 1.4rem;
  margin-bottom: 1.25rem;
}
.idle-layout {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
@media (min-width: 640px) {
  .idle-layout {
    flex-direction: row;
    align-items: flex-start;
    gap: 1.5rem;
  }
}
.idle-visual {
  position: relative;
  flex-shrink: 0;
  width: 140px;
  height: 100px;
  margin: 0 auto;
}
@media (min-width: 640px) {
  .idle-visual {
    margin: 0;
  }
}
.deck-card {
  position: absolute;
  width: 72px;
  height: 96px;
  border-radius: 8px;
  border: 1px solid rgba(201, 168, 76, 0.45);
  background: linear-gradient(145deg, rgba(30, 24, 40, 0.95), rgba(12, 10, 18, 0.98));
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}
.deck-card.c1 {
  left: 0;
  top: 4px;
  transform: rotate(-14deg);
  z-index: 1;
}
.deck-card.c2 {
  left: 34px;
  top: 0;
  transform: rotate(0deg);
  z-index: 2;
  border-color: rgba(201, 168, 76, 0.65);
}
.deck-card.c3 {
  left: 68px;
  top: 4px;
  transform: rotate(14deg);
  z-index: 1;
}
.idle-title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
  letter-spacing: 0.04em;
}
.idle-intro {
  margin: 0 0 0.85rem;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--text-secondary);
}
.idle-steps {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--text-secondary);
  font-size: 0.86rem;
  line-height: 1.65;
}
.idle-steps li {
  margin-bottom: 0.35rem;
}
.idle-steps li:last-child {
  margin-bottom: 0;
}
.selection-preview {
  margin-top: 1.25rem;
  padding-top: 1.1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.preview-label {
  display: block;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-muted);
  margin-bottom: 0.55rem;
}
.preview-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.preview-chip {
  font-size: 0.78rem;
  padding: 0.4rem 0.65rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.22);
  color: var(--text-secondary);
  max-width: 100%;
  line-height: 1.3;
}
.state-block {
  text-align: center;
  padding: 2rem 1rem;
}
.state-title {
  font-family: var(--font-display);
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}
.state-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.error-card {
  border-color: rgba(255, 107, 107, 0.35);
}
.reading {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.chip {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
}
.chip.source {
  margin-left: auto;
  color: var(--text-muted);
}
.card-block,
.sections {
  padding: 1.35rem 1.25rem;
}
.block-title {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--gold);
  margin: 0 0 0.75rem;
}
.card-name {
  font-family: var(--font-display);
  font-size: 1.65rem;
  margin: 0 0 0.75rem;
  color: var(--text-primary);
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-bottom: 0.85rem;
}
.core {
  font-size: 1rem;
  line-height: 1.55;
  color: var(--text-secondary);
  margin: 0;
}
.sections h3 {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-muted);
  margin: 0 0 0.35rem;
}
.sections .sec {
  margin-bottom: 1.1rem;
}
.sections .sec:last-child {
  margin-bottom: 0;
}
.sections p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.55;
  font-size: 0.95rem;
}
.sections .caution p {
  color: #e8a0a0;
}
.sections .affirm p {
  font-style: italic;
  color: var(--gold-light);
}
</style>
