<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ZODIAC_SIGNS } from '../lib/zodiac';
import type { TarotPublicCard, ZodiacSign } from '../lib/types';
import { useTarot } from '../composables/useTarot';
import { useProfile } from '../composables/useProfile';
import { useAuth } from '../composables/useAuth';
import { track } from '../lib/analytics';
import { tarotService } from '../lib';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import GuestResultGate from '../components/GuestResultGate.vue';
import TarotCardDisplay from '../components/TarotCardDisplay.vue';

const { t, locale } = useI18n();
const { profile, load: loadProfile } = useProfile();
const { isAuthenticated } = useAuth();
const { loading, error, empty, data, load, hasReading } = useTarot();
// Guests can choose a sign, but the reading itself sits behind the gate.
const showGuestGate = ref(false);

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Today's calendar date (YYYY-MM-DD) in the given IANA timezone. */
function todayInTz(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

const selectedSign = ref<ZodiacSign>('leo');

const sunSign = computed(() => profile.value?.natalChart?.sunSign ?? null);

// Reading is always for today, in the profile's timezone (falling back to the browser's).
const resolvedTimezone = computed(() => profile.value?.user?.timezone?.trim() || browserTimeZone());
const todayDate = computed(() => todayInTz(resolvedTimezone.value));

onMounted(async () => {
  // Authenticated: default to the profile's sun sign before auto-loading today's reading.
  if (isAuthenticated.value) {
    await loadProfile();
    if (sunSign.value) selectedSign.value = sunSign.value;
  }
  await reveal();
});

// Today's reading loads automatically — no manual "draw" step.
async function reveal(): Promise<void> {
  if (!isAuthenticated.value) {
    showGuestGate.value = true;
    track('guest_result_gate_shown', { surface: 'tarot' });
    return;
  }
  showGuestGate.value = false;
  await load({
    sign: selectedSign.value,
    timezone: resolvedTimezone.value,
    date: todayDate.value,
    lang: locale.value,
  });
}

// Switching sign re-fetches that sign's reading right away.
watch(() => selectedSign.value, () => {
  void reveal();
});

watch(locale, async () => {
  if (hasReading.value) await reveal();
});

// Two modes: the once-a-day card, and a free "ask the cards" draw that reshuffles
// on every press (server-randomized, never cached).
type TarotMode = 'daily' | 'draw';
const mode = ref<TarotMode>('daily');
const drawnCard = ref<TarotPublicCard | null>(null);
const drawLoading = ref(false);
const drawError = ref<string | null>(null);

function selectMode(next: TarotMode): void {
  if (mode.value === next) return;
  mode.value = next;
  if (next === 'draw') showGuestGate.value = !isAuthenticated.value;
  else if (isAuthenticated.value) showGuestGate.value = false;
}

async function drawCard(): Promise<void> {
  if (!isAuthenticated.value) {
    showGuestGate.value = true;
    track('guest_result_gate_shown', { surface: 'tarot_draw' });
    return;
  }
  showGuestGate.value = false;
  drawLoading.value = true;
  drawError.value = null;
  try {
    drawnCard.value = await tarotService.fetchTarotDraw({ lang: locale.value });
    track('tarot_card_drawn', { surface: 'tarot' });
  } catch (e) {
    drawError.value = (e as Error).message ?? t('tarot.errorTitle');
  } finally {
    drawLoading.value = false;
  }
}

// Re-draw in the new language so a drawn card isn't left in the previous locale.
watch(locale, async () => {
  if (mode.value === 'draw' && drawnCard.value) await drawCard();
});

// Reading is split into pickable sections (like the daily horoscope), so the user
// chooses what to read instead of scrolling one long stack.
type TarotSectionKey = 'overview' | 'love' | 'career' | 'energy';
const activeSection = ref<TarotSectionKey>('overview');
const sectionTabs = computed(() => [
  { key: 'overview' as const, label: t('tarot.overview'), icon: '✦', accent: '#c9a84c' },
  { key: 'love' as const, label: t('tarot.love'), icon: '♡', accent: '#ff6b9c' },
  { key: 'career' as const, label: t('tarot.career'), icon: '✧', accent: '#9ec6ff' },
  { key: 'energy' as const, label: t('tarot.energyNarrative'), icon: '⚡', accent: '#f4d98b' },
]);

</script>

<template>
  <div class="tarot-page">
    <header class="hero">
      <h1 class="title">{{ t('tarot.title') }}</h1>
    </header>

    <nav class="mode-row" :aria-label="t('tarot.modeLabel')">
      <button
        type="button"
        class="mode-tab"
        :class="{ active: mode === 'daily' }"
        :aria-pressed="mode === 'daily'"
        @click="selectMode('daily')"
      >{{ t('tarot.modeDaily') }}</button>
      <button
        type="button"
        class="mode-tab"
        :class="{ active: mode === 'draw' }"
        :aria-pressed="mode === 'draw'"
        @click="selectMode('draw')"
      >{{ t('tarot.modeDraw') }}</button>
    </nav>

    <GuestResultGate v-if="showGuestGate" :message="t('guestGate.tarotTitle')" />

    <!-- Daily card: one precomputed card per sign per day. -->
    <template v-if="mode === 'daily'">
      <div class="controls glass-card">
        <div class="field">
          <label class="label" id="tarot-sign-label">{{ t('tarot.signLabel') }}</label>
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
      </div>

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
        <TarotCardDisplay :card="data.card_of_the_day" :label="t('tarot.cardTitle')" />

        <div class="energy-block glass-card">
          <div class="energy-head">
            <span class="energy-label">{{ t('tarot.energy') }}</span>
            <span class="energy-value">{{ data.energyScore }}<span class="energy-max">/100</span></span>
          </div>
          <div
            class="energy-track"
            role="progressbar"
            :aria-valuenow="data.energyScore"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="energy-fill" :style="{ width: data.energyScore + '%' }" />
          </div>
        </div>

        <article class="sections glass-card">
          <h2 class="block-title">{{ t('tarot.sections') }}</h2>
          <div class="tab-row" role="tablist">
            <button
              v-for="tab in sectionTabs"
              :key="tab.key"
              type="button"
              role="tab"
              class="tab"
              :class="{ active: activeSection === tab.key }"
              :aria-selected="activeSection === tab.key"
              :style="activeSection === tab.key ? { '--tab-accent': tab.accent } : {}"
              @click="activeSection = tab.key"
            >
              <span class="tab-icon" :style="{ color: tab.accent }" aria-hidden="true">{{ tab.icon }}</span>
              <span class="tab-label">{{ tab.label }}</span>
            </button>
          </div>
          <p class="section-body" role="tabpanel">{{ data.reading[activeSection] }}</p>
        </article>
      </section>
    </template>

    <!-- Ask the cards: a fresh random card on every press. -->
    <template v-else>
      <section class="draw-block glass-card">
        <button
          type="button"
          class="btn-celestial draw-btn"
          :disabled="drawLoading"
          @click="drawCard"
        >
          {{ drawLoading ? t('tarot.drawLoading') : (drawnCard ? t('tarot.drawAgain') : t('tarot.drawCta')) }}
        </button>
      </section>

      <section v-if="drawLoading" class="state-block" role="status" aria-live="polite">
        <LoadingSpinner />
        <p class="state-text">{{ t('tarot.loading') }}</p>
      </section>

      <section v-else-if="drawError" class="state-block glass-card error-card" role="alert">
        <p class="state-title">{{ t('tarot.errorTitle') }}</p>
        <p class="state-text">{{ drawError }}</p>
      </section>

      <section v-else-if="drawnCard" class="reading">
        <TarotCardDisplay :card="drawnCard" :label="t('tarot.drawnCardTitle')" />
      </section>
    </template>
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
.mode-row {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
}
.mode-tab {
  flex: 0 0 auto;
  padding: 0.45rem 1.2rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: rgba(15, 15, 40, 0.55);
  color: var(--text-muted);
  font-family: var(--font-body);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}
.mode-tab:hover { border-color: var(--glass-border-hover); }
.mode-tab:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
.mode-tab.active {
  border-color: var(--gold);
  color: var(--gold);
  background: var(--gold-glow);
}
.draw-block {
  padding: 1.5rem 1.25rem;
  margin-bottom: 1.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.1rem;
  text-align: center;
}
.draw-btn {
  max-width: 340px;
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
  transition: border-color 0.2s, background 0.2s, color 0.2s, transform 0.15s, box-shadow 0.2s;
}
.sign-pill:hover {
  border-color: rgba(201, 168, 76, 0.4);
  transform: translateY(-1px);
}
.sign-pill:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
.sign-pill .sym {
  font-size: 1.05rem;
  color: var(--gold-dim);
  transition: color 0.2s, transform 0.2s;
}
.sign-pill.active {
  border-color: rgba(201, 168, 76, 0.55);
  background: var(--gold-glow);
  color: var(--text-primary);
  box-shadow: 0 0 0 1px rgba(201, 168, 76, 0.35), 0 4px 16px rgba(201, 168, 76, 0.18);
}
.sign-pill.active .sym {
  color: var(--gold);
  transform: scale(1.12);
}
.sign-pill .nm {
  line-height: 1.1;
  text-align: center;
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
  animation: reading-in 0.45s ease both;
}
@keyframes reading-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .reading {
    animation: none;
  }
}
.energy-block {
  padding: 1rem 1.25rem 1.1rem;
}
.energy-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}
.energy-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-muted);
}
.energy-value {
  font-family: var(--font-body);
  font-size: 1.35rem;
  color: var(--gold);
  line-height: 1;
}
.energy-max {
  font-size: 0.8rem;
  color: var(--text-muted);
}
.energy-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
}
.energy-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--gold-dim), var(--gold));
  box-shadow: 0 0 12px rgba(201, 168, 76, 0.5);
  transition: width 0.6s ease;
}
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
.tab-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 1.2rem;
}
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.55rem 0.4rem;
  border-radius: var(--radius-sm, 12px);
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}
.tab:hover { color: var(--text-secondary); }
.tab:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
.tab.active {
  color: var(--text-primary);
  border-color: var(--tab-accent, var(--gold));
  background: color-mix(in srgb, var(--tab-accent, var(--gold)) 16%, transparent);
}
.tab-icon { font-size: 1.05rem; line-height: 1; }
.tab-label { white-space: nowrap; }
.section-body {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 0.98rem;
  min-height: 4.5rem;
}
@media (max-width: 480px) {
  .tab { padding: 0.5rem 0.25rem; font-size: 0.68rem; }
  .tab-label { font-size: 0.66rem; }
}
</style>
