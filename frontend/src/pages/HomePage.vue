<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';
import { useProfile } from '../composables/useProfile';
import { useHoroscope } from '../composables/useHoroscope';
import { usePeriodHoroscope } from '../composables/usePeriodHoroscope';
import { ZODIAC_SIGNS, elementColor } from '../lib/zodiac';
import type { PeriodType, ZodiacSign } from '../lib/types';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { buildHoroscopeShareCardPayload } from '../lib/horoscopeShareCard';
import { shareHoroscopeCardOnWeb } from '../lib/horoscopeShareWeb';
import { isDailyReadingRevealed, persistDailyReadingRevealed } from '../lib/dailyReadingReveal';
import { track } from '../lib/analytics';

const { t, locale } = useI18n();
const { user, isAuthenticated } = useAuth();
const { profile, error: profileError, load: loadProfile } = useProfile();
const { horoscope, loading, error: horoscopeError, load: loadHoroscope, completeToday, reset: resetHoroscope } =
  useHoroscope();
const {
  reading: periodReading,
  loading: periodLoading,
  error: periodError,
  load: loadPeriod,
  reset: resetPeriod,
} = usePeriodHoroscope();

type Period = 'daily' | PeriodType;
const period = ref<Period>('daily');
const selectedSign = ref<ZodiacSign | null>(null);
const shareBusy = ref(false);
const shareError = ref<string | null>(null);
const completionBusy = ref(false);
const completionError = ref<string | null>(null);
const completionMessage = ref<string | null>(null);
const revealedToday = ref(false);

const sunSign = computed<ZodiacSign | null>(() => profile.value?.natalChart?.sunSign ?? null);
const sunSignName = computed(() => (sunSign.value ? t(`zodiac.${sunSign.value}`) : ''));
const sunSignSymbol = computed(() => sunSign.value ? ZODIAC_SIGNS.find((s) => s.key === sunSign.value)?.symbol : '');
const streakCount = computed(() => horoscope.value?.streakCount ?? user.value?.streakCount ?? 0);
const hasServerRevealToday = computed(() =>
  Boolean(
    user.value
      && horoscope.value
      && horoscope.value.streakLastDate
      && horoscope.value.streakLastDate === horoscope.value.date,
  ));

const today = computed(() =>
  new Date().toLocaleDateString(locale.value === 'mn' ? 'mn-MN' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }),
);

onMounted(async () => {
  // Guests can read the public horoscope by sign; only signed-in users have a
  // saved birth chart to personalize from, so skip the auth-only profile fetch.
  if (isAuthenticated.value) await loadProfile();
  const sign = sunSign.value ?? 'aries';
  selectedSign.value = sign;
  await loadHoroscope(sign);
});

async function selectSign(sign: ZodiacSign): Promise<void> {
  selectedSign.value = sign;
  await loadHoroscope(sign);
  if (period.value !== 'daily') await loadPeriod(sign, period.value);
}

async function selectPeriod(next: Period): Promise<void> {
  period.value = next;
  if (next !== 'daily' && selectedSign.value) {
    await loadPeriod(selectedSign.value, next);
  }
}

async function shareTodayReading(): Promise<void> {
  if (!horoscope.value || shareBusy.value) return;
  shareBusy.value = true;
  shareError.value = null;
  const eventBase = { source: 'home', sign: horoscope.value.sign, date: horoscope.value.date };
  track('horoscope_share_card_opened', eventBase);
  try {
    const payload = buildHoroscopeShareCardPayload(horoscope.value, {
      locale: locale.value === 'mn' ? 'mn-MN' : 'en-US',
    });
    track('horoscope_share_card_generated', { ...eventBase, surface: 'web' });
    const result = await shareHoroscopeCardOnWeb(payload);
    track('horoscope_share_card_shared', { ...eventBase, method: result.method });
  } catch (err) {
    shareError.value = t('home.shareError');
    track('horoscope_share_card_failed', {
      ...eventBase,
      reason: err instanceof Error ? err.message.slice(0, 80) : 'unknown',
    });
  } finally {
    shareBusy.value = false;
  }
}

function refreshRevealState(): void {
  if (!horoscope.value) {
    revealedToday.value = false;
    return;
  }
  if (hasServerRevealToday.value) {
    revealedToday.value = true;
    persistDailyReadingRevealed(horoscope.value.date, user.value?.id);
    return;
  }
  revealedToday.value = isDailyReadingRevealed(horoscope.value.date, user.value?.id);
}

async function revealTodayReading(): Promise<void> {
  if (!horoscope.value || completionBusy.value) return;
  const date = horoscope.value.date;
  track('daily_reading_reveal_clicked', { source: 'home', date });
  if (revealedToday.value || hasServerRevealToday.value) {
    revealedToday.value = true;
    persistDailyReadingRevealed(date, user.value?.id);
    completionMessage.value = t('home.ritualComplete');
    track('daily_reading_already_revealed', { source: 'home', date });
    return;
  }
  completionBusy.value = true;
  completionError.value = null;
  try {
    if (user.value) {
      const result = await completeToday();
      track('daily_ritual_completed', {
        completedDate: result.completedDate,
        currentStreak: result.currentStreak,
        alreadyCompletedToday: result.alreadyCompletedToday,
        shouldCelebrate: result.shouldCelebrate,
        milestone: result.milestoneReached,
      });
      track(result.alreadyCompletedToday ? 'daily_reading_already_revealed' : 'daily_reading_revealed', {
        source: 'home',
        date: result.completedDate,
        currentStreak: result.currentStreak,
      });
      // Activation milestone — gated by the server's once-per-user flag, so it fires at most once.
      if (result.firstHoroscopeReveal) {
        const createdAt = user.value?.createdAt;
        const created = createdAt ? Date.parse(createdAt) : Number.NaN;
        const props: Record<string, string | number> = { platform: 'web' };
        if (horoscope.value?.sign) props.sign = horoscope.value.sign;
        if (!Number.isNaN(created)) {
          props.days_since_signup = Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
        }
        track('first_horoscope_revealed', props);
      }
    } else {
      track('daily_reading_revealed', { source: 'home', date });
    }
    revealedToday.value = true;
    persistDailyReadingRevealed(date, user.value?.id);
    completionMessage.value = t('home.ritualComplete');
  } catch (err) {
    completionError.value = err instanceof Error ? err.message : 'Unable to reveal today yet.';
  } finally {
    completionBusy.value = false;
  }
}

watch(locale, async () => {
  resetHoroscope();
  resetPeriod();
  if (selectedSign.value) {
    await loadHoroscope(selectedSign.value);
    if (period.value !== 'daily') await loadPeriod(selectedSign.value, period.value);
  }
});

watch([horoscope, user], () => {
  refreshRevealState();
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return t('home.greetingMorning');
  if (hour < 18) return t('home.greetingAfternoon');
  return t('home.greetingEvening');
});

const firstName = computed(() => user.value?.fullName?.split(' ')[0] ?? '');

// The reading currently on screen: the daily horoscope, or the loaded monthly/yearly one.
const activeReading = computed(() => (period.value === 'daily' ? horoscope.value : periodReading.value));
const displayLoading = computed(() => (period.value === 'daily' ? loading.value : periodLoading.value));
const displayError = computed(() => (period.value === 'daily' ? horoscopeError.value : periodError.value));
// Daily stays gated behind the reveal ritual; monthly/yearly show as soon as they load.
const showReading = computed(
  () => Boolean(activeReading.value) && !displayLoading.value && (period.value !== 'daily' || revealedToday.value),
);

const periodTabs = computed(() => [
  { key: 'daily' as Period, label: t('home.periodDaily') },
  { key: 'weekly' as Period, label: t('home.periodWeekly') },
  { key: 'monthly' as Period, label: t('home.periodMonthly') },
  { key: 'yearly' as Period, label: t('home.periodYearly') },
]);

type PredictionKey = 'love' | 'career' | 'health';
const activePrediction = ref<PredictionKey>('love');
const predictionTabs = computed(() => [
  { key: 'love' as const, title: t('home.love'), icon: '❤', accent: '#ff6b9c', body: activeReading.value?.love ?? '' },
  { key: 'career' as const, title: t('home.career'), icon: '♃', accent: '#9ec6ff', body: activeReading.value?.career ?? '' },
  { key: 'health' as const, title: t('home.health'), icon: '✚', accent: '#7bbf6a', body: activeReading.value?.health ?? '' },
]);
const activePredictionTab = computed(
  () => predictionTabs.value.find((p) => p.key === activePrediction.value) ?? predictionTabs.value[0],
);
</script>

<template>
  <AppContainer size="md">
    <ScreenLayout class="home-page">
    <header class="hero glass-card">
      <p class="hero-eyebrow">{{ firstName ? `${greeting}, ${firstName}` : greeting }}</p>
      <div v-if="sunSign" class="hero-sign">
        <span class="hero-glyph">{{ sunSignSymbol }}</span>
        <span class="hero-name">{{ sunSignName }}</span>
      </div>
      <div class="hero-meta">
        <span class="meta-date">{{ today }}</span>
        <span v-if="streakCount > 0" class="streak-chip">🔥 {{ streakCount }}</span>
      </div>
    </header>

    <nav class="sign-row mobile-scroll-x" :aria-label="t('home.browseAllSigns')">
      <button
        v-for="sign in ZODIAC_SIGNS"
        :key="sign.key"
        type="button"
        class="sign-chip"
        :class="{ active: selectedSign === sign.key }"
        :aria-label="t(`zodiac.${sign.key}`)"
        :aria-pressed="selectedSign === sign.key"
        @click="selectSign(sign.key)"
      >
        <span class="sign-chip-glyph" :style="{ color: elementColor(sign.element) }">{{ sign.symbol }}</span>
        <span class="sign-chip-name">{{ t(`zodiac.${sign.key}`) }}</span>
      </button>
    </nav>

    <nav class="period-row" :aria-label="t('home.browseAllSigns')">
      <button
        v-for="p in periodTabs"
        :key="p.key"
        type="button"
        class="period-tab"
        :class="{ active: period === p.key }"
        :aria-pressed="period === p.key"
        @click="selectPeriod(p.key)"
      >
        {{ p.label }}
      </button>
    </nav>

    <p v-if="profileError" class="api-error" role="alert">{{ profileError }}</p>
    <p v-else-if="displayError" class="api-error" role="alert">{{ displayError }}</p>

    <LoadingSpinner v-if="displayLoading" :label="t('home.readingStars')" />

    <section v-if="period === 'daily' && horoscope && !loading && !revealedToday" class="reveal-card glass-card">
      <p class="reveal-text">{{ t('home.readingReady') }}</p>
      <button type="button" class="btn-celestial reveal-btn" :disabled="completionBusy" @click="revealTodayReading">
        {{ completionBusy ? t('home.readingStars') : t('home.revealReading') }}
      </button>
      <p v-if="completionError" class="share-error" role="alert">{{ completionError }}</p>
    </section>

    <section v-if="showReading" class="reading">
      <article class="overall glass-card">
        <p class="overall-text">{{ activeReading?.overall }}</p>
        <button v-if="period === 'daily'" type="button" class="share-reading-btn" :disabled="shareBusy" @click="shareTodayReading">
          {{ shareBusy ? t('home.sharePreparing') : `↗ ${t('home.shareTodayReading')}` }}
        </button>
        <p v-if="shareError" class="share-error" role="alert">{{ shareError }}</p>
      </article>

      <article class="prediction-tabs glass-card">
        <div class="tab-row" role="tablist">
          <button
            v-for="tab in predictionTabs"
            :key="tab.key"
            type="button"
            role="tab"
            class="tab"
            :class="{ active: activePrediction === tab.key }"
            :aria-selected="activePrediction === tab.key"
            :style="activePrediction === tab.key ? { '--tab-accent': tab.accent } : {}"
            @click="activePrediction = tab.key"
          >
            <span class="tab-icon" :style="{ color: tab.accent }">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.title }}</span>
          </button>
        </div>
        <p class="prediction-body" role="tabpanel">{{ activePredictionTab?.body }}</p>
      </article>

      <div class="lucky-row">
        <div class="lucky-card glass-card">
          <span class="lucky-label">{{ t('home.luckyNumber') }}</span>
          <span class="lucky-value">{{ activeReading?.luckyNumber }}</span>
        </div>
        <div class="lucky-card glass-card">
          <span class="lucky-label">{{ t('home.luckyColor') }}</span>
          <span class="lucky-value lucky-color">{{ activeReading?.luckyColor }}</span>
        </div>
      </div>
    </section>

    <section v-if="!isAuthenticated" class="guest-cta glass-card">
      <p class="guest-cta-title">{{ t('home.guestTitle') }}</p>
      <p class="guest-cta-body">{{ t('home.guestBody') }}</p>
      <div class="guest-cta-actions">
        <router-link to="/register" class="btn-celestial guest-cta-btn">{{ t('home.guestCreate') }}</router-link>
        <router-link to="/login" class="guest-cta-link">{{ t('home.guestSignIn') }}</router-link>
      </div>
    </section>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.api-error {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: rgba(255, 90, 90, 0.12);
  border: 1px solid rgba(255, 120, 120, 0.35);
  color: #ffb4b4;
  font-size: 0.9rem;
}

.home-page { padding-top: 0.2rem; }

/* Hero */
.hero {
  margin-top: 1.5rem;
  text-align: center;
  padding: 1.75rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
}
.hero-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-muted);
}
.hero-sign { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
.hero-glyph {
  font-size: 3.4rem;
  line-height: 1;
  color: var(--gold);
  filter: drop-shadow(0 0 18px var(--gold-glow));
}
.hero-name {
  font-family: var(--font-display);
  font-size: 1.85rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-primary);
}
.hero-meta { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.15rem; }
.meta-date { color: var(--text-secondary); font-size: 0.85rem; }
.streak-chip {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--gold-light);
  background: var(--gold-glow);
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  padding: 0.12rem 0.6rem;
}

/* Sign selector strip */
.sign-row {
  display: flex;
  justify-content: safe center;
  gap: 0.5rem;
  padding: 0.15rem 0.1rem 0.4rem;
}
.sign-chip {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}
.sign-chip-glyph {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: rgba(15, 15, 40, 0.55);
  font-size: 1.3rem;
  line-height: 1;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}
.sign-chip-name {
  font-size: 0.6rem;
  line-height: 1;
  color: var(--text-muted, rgba(255, 255, 255, 0.65));
  max-width: 60px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sign-chip:hover .sign-chip-glyph { border-color: var(--glass-border-hover); transform: translateY(-2px); }
.sign-chip.active .sign-chip-glyph {
  border-color: var(--gold);
  box-shadow: 0 0 18px var(--gold-glow);
  background: var(--gold-glow);
}
.sign-chip.active .sign-chip-name { color: var(--gold); }

/* On phones the 12-sign scroll strip overruns the width. Collapse it into a
   tidy 6x2 grid of glyph-only chips that fits the screen with no side-scroll.
   The selected sign's name is already shown large in the hero above. */
@media (max-width: 560px) {
  .sign-row {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.55rem 0.3rem;
    overflow-x: visible;
    padding: 0.1rem 0 0.5rem;
  }
  .sign-chip { width: 100%; }
  .sign-chip-glyph { width: 44px; height: 44px; font-size: 1.2rem; }
  .sign-chip-name { display: none; }
}

/* Daily / Monthly / Yearly toggle */
.period-row {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  margin: 0.1rem 0 0.2rem;
}
.period-tab {
  flex: 0 0 auto;
  padding: 0.4rem 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: rgba(15, 15, 40, 0.55);
  color: var(--text-muted, rgba(255, 255, 255, 0.7));
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}
.period-tab:hover { border-color: var(--glass-border-hover); }
.period-tab.active {
  border-color: var(--gold);
  color: var(--gold);
  background: var(--gold-glow);
}

/* Reveal */
.reveal-card {
  text-align: center;
  padding: 1.75rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.reveal-text {
  font-family: var(--font-display);
  font-size: 1.3rem;
  line-height: 1.45;
  color: var(--text-primary);
}
.reveal-btn { max-width: 340px; }

/* Reading */
.reading { display: flex; flex-direction: column; gap: 1rem; }
.overall { padding: 1.75rem; text-align: center; }
.overall-text {
  font-family: var(--font-display);
  font-size: 1.4rem;
  line-height: 1.55;
  color: var(--text-primary);
  font-style: italic;
}
.share-reading-btn {
  margin-top: 1.4rem;
  border: 1px solid rgba(244, 217, 139, 0.42);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(244, 217, 139, 0.2), rgba(184, 168, 255, 0.22));
  color: var(--text-primary);
  padding: 0.8rem 1.2rem;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 18px 50px rgba(184, 168, 255, 0.16);
}
.share-reading-btn:disabled {
  cursor: wait;
  opacity: 0.68;
}
.completion-message {
  margin-top: 0.9rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.55;
}
.share-error {
  margin-top: 0.8rem;
  color: #ffb4b4;
  font-size: 0.9rem;
}
.prediction-tabs {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.tab-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}
.tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.6rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}
.tab:hover { color: var(--text-secondary); }
.tab.active {
  color: var(--text-primary);
  border-color: var(--tab-accent, var(--gold));
  background: color-mix(in srgb, var(--tab-accent, var(--gold)) 16%, transparent);
}
.tab-icon { font-size: 1.1rem; line-height: 1; }
.tab-label { white-space: nowrap; }
.prediction-body {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--text-secondary);
  margin: 0;
  min-height: 4.5rem;
}
@media (max-width: 480px) {
  .tab { padding: 0.55rem 0.35rem; }
  .tab-label { font-size: 0.8rem; }
}
.lucky-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 480px) { .lucky-row { grid-template-columns: 1fr; } }
.lucky-card {
  padding: 1.4rem 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: center;
}
.lucky-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 2px;
}
.lucky-value {
  font-family: var(--font-display);
  font-size: 1.8rem;
  color: var(--gold-light);
  font-weight: 600;
}
.lucky-value.lucky-color { font-size: 1.3rem; }

/* Guest nudge — visible only when signed out, inviting account creation
   (which is also the gateway to personalized readings and Premium). */
.guest-cta {
  padding: 1.6rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}
.guest-cta-title {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
}
.guest-cta-body {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  max-width: 32rem;
}
.guest-cta-actions {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  max-width: 340px;
}
.guest-cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
.guest-cta-link {
  color: var(--gold-light);
  text-decoration: none;
  font-size: 0.9rem;
}
.guest-cta-link:hover { color: var(--gold); }
</style>
