<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';
import { useProfile } from '../composables/useProfile';
import { useHoroscope } from '../composables/useHoroscope';
import { ZODIAC_SIGNS, elementColor } from '../lib/zodiac';
import type { ZodiacSign } from '../lib/types';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { buildHoroscopeShareCardPayload } from '../lib/horoscopeShareCard';
import { shareHoroscopeCardOnWeb } from '../lib/horoscopeShareWeb';
import { isDailyReadingRevealed, persistDailyReadingRevealed } from '../lib/dailyReadingReveal';
import { track } from '../lib/analytics';

const { t, locale } = useI18n();
const { user } = useAuth();
const { profile, error: profileError, load: loadProfile } = useProfile();
const { horoscope, loading, error: horoscopeError, load: loadHoroscope, completeToday, reset: resetHoroscope } =
  useHoroscope();

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
  await loadProfile();
  const sign = sunSign.value ?? 'aries';
  selectedSign.value = sign;
  await loadHoroscope(sign);
});

async function selectSign(sign: ZodiacSign): Promise<void> {
  selectedSign.value = sign;
  await loadHoroscope(sign);
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
  if (selectedSign.value) await loadHoroscope(selectedSign.value);
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

const firstName = computed(() => user.value?.fullName?.split(' ')[0] ?? t('home.stargazer'));

type PredictionKey = 'love' | 'career' | 'health';
const activePrediction = ref<PredictionKey>('love');
const predictionTabs = computed(() => [
  { key: 'love' as const, title: t('home.love'), icon: '❤', accent: '#ff6b9c', body: horoscope.value?.love ?? '' },
  { key: 'career' as const, title: t('home.career'), icon: '♃', accent: '#9ec6ff', body: horoscope.value?.career ?? '' },
  { key: 'health' as const, title: t('home.health'), icon: '✚', accent: '#7bbf6a', body: horoscope.value?.health ?? '' },
]);
const activePredictionTab = computed(
  () => predictionTabs.value.find((p) => p.key === activePrediction.value) ?? predictionTabs.value[0],
);
</script>

<template>
  <AppContainer size="md">
    <ScreenLayout class="home-page">
    <header class="hero glass-card">
      <p class="hero-eyebrow">{{ greeting }}, {{ firstName }}</p>
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
      </button>
    </nav>

    <p v-if="profileError" class="api-error" role="alert">{{ profileError }}</p>
    <p v-else-if="horoscopeError" class="api-error" role="alert">{{ horoscopeError }}</p>

    <LoadingSpinner v-if="loading" :label="t('home.readingStars')" />

    <section v-if="horoscope && !loading && !revealedToday" class="reveal-card glass-card">
      <p class="reveal-text">{{ t('home.readingReady') }}</p>
      <button type="button" class="btn-celestial reveal-btn" :disabled="completionBusy" @click="revealTodayReading">
        {{ completionBusy ? t('home.readingStars') : t('home.revealReading') }}
      </button>
      <p v-if="completionError" class="share-error" role="alert">{{ completionError }}</p>
    </section>

    <section v-if="horoscope && !loading && revealedToday" class="reading">
      <article class="overall glass-card">
        <p class="overall-text">{{ horoscope.overall }}</p>
        <button type="button" class="share-reading-btn" :disabled="shareBusy" @click="shareTodayReading">
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
          <span class="lucky-value">{{ horoscope.luckyNumber }}</span>
        </div>
        <div class="lucky-card glass-card">
          <span class="lucky-label">{{ t('home.luckyColor') }}</span>
          <span class="lucky-value lucky-color">{{ horoscope.luckyColor }}</span>
        </div>
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
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: rgba(15, 15, 40, 0.55);
  cursor: pointer;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}
.sign-chip-glyph { font-size: 1.3rem; line-height: 1; }
.sign-chip:hover { border-color: var(--glass-border-hover); transform: translateY(-2px); }
.sign-chip.active {
  border-color: var(--gold);
  box-shadow: 0 0 18px var(--gold-glow);
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
</style>
