<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';
import { useProfile } from '../composables/useProfile';
import { useHoroscope } from '../composables/useHoroscope';
import { ZODIAC_SIGNS } from '../lib/zodiac';
import type { ZodiacSign } from '../lib/types';
import ZodiacCard from '../components/ZodiacCard.vue';
import PredictionCard from '../components/PredictionCard.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { buildHoroscopeShareCardPayload } from '../lib/horoscopeShareCard';
import { shareHoroscopeCardOnWeb } from '../lib/horoscopeShareWeb';
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

const sunSign = computed<ZodiacSign | null>(() => profile.value?.natalChart?.sunSign ?? null);
const sunSignName = computed(() => (sunSign.value ? t(`zodiac.${sunSign.value}`) : ''));
const sunSignSymbol = computed(() => sunSign.value ? ZODIAC_SIGNS.find((s) => s.key === sunSign.value)?.symbol : '');

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

function completionSeenKey(date: string): string {
  return `engagement:daily-ritual-completion-seen:${date}`;
}

async function completeTodayReading(): Promise<void> {
  if (!user.value || !horoscope.value || completionBusy.value) return;
  completionBusy.value = true;
  completionError.value = null;
  try {
    const result = await completeToday();
    track('daily_ritual_completed', {
      completedDate: result.completedDate,
      currentStreak: result.currentStreak,
      alreadyCompletedToday: result.alreadyCompletedToday,
      shouldCelebrate: result.shouldCelebrate,
      milestone: result.milestoneReached,
    });
    if (!result.shouldCelebrate || window.localStorage.getItem(completionSeenKey(result.completedDate)) === '1') {
      track('daily_ritual_completion_replayed_blocked', { completedDate: result.completedDate, source: 'home' });
      completionMessage.value = `${result.currentStreak} дахь өдөр аль хэдийн баталгаажсан.`;
      return;
    }
    window.localStorage.setItem(completionSeenKey(result.completedDate), '1');
    completionMessage.value = result.milestoneReached === 30
      ? '30 өдрийн сарны мөчлөг бүрдлээ. Энэ бол зүгээр нэг дараалал биш — таны өөртөө гаргасан жижиг орон зай.'
      : `${result.currentStreak} дахь өдөр баталгаажлаа. Та энэ жижиг зан үйлдээ дахин эргэн ирлээ.`;
    track('streak_completion_celebrated', {
      streakCount: result.currentStreak,
      milestone: result.milestoneReached,
      freezeAwarded: result.streakFreezeAwarded,
    });
    if (result.milestoneReached) {
      track('streak_milestone_reached', {
        streakCount: result.currentStreak,
        milestone: result.milestoneReached,
        freezeAwarded: result.streakFreezeAwarded,
      });
    }
  } catch (err) {
    completionError.value = err instanceof Error ? err.message : 'Unable to complete today yet.';
  } finally {
    completionBusy.value = false;
  }
}

watch(locale, async () => {
  resetHoroscope();
  if (selectedSign.value) await loadHoroscope(selectedSign.value);
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return t('home.greetingMorning');
  if (hour < 18) return t('home.greetingAfternoon');
  return t('home.greetingEvening');
});

const firstName = computed(() => user.value?.fullName?.split(' ')[0] ?? t('home.stargazer'));
</script>

<template>
  <AppContainer size="lg">
    <ScreenLayout class="home-page">
    <header class="hero">
      <p class="greeting">{{ greeting }}, {{ firstName }}</p>
      <h1 class="title">{{ t('home.yourStarsToday') }}</h1>
      <p class="date">{{ today }}</p>
      <div v-if="sunSign" class="big-sign">
        <span class="big-sign-symbol">{{ sunSignSymbol }}</span>
        <span class="big-sign-name">{{ sunSignName }} {{ t('home.sunSuffix') }}</span>
      </div>
    </header>

    <section class="zodiac-strip">
      <p class="section-label">{{ t('home.browseAllSigns') }}</p>
      <div class="zodiac-grid">
        <ZodiacCard
          v-for="sign in ZODIAC_SIGNS"
          :key="sign.key"
          :sign="sign"
          compact
          :active="selectedSign === sign.key"
          @select="selectSign(sign.key)"
        />
      </div>
    </section>

    <p v-if="profileError" class="api-error" role="alert">{{ profileError }}</p>
    <p v-else-if="horoscopeError" class="api-error" role="alert">{{ horoscopeError }}</p>

    <LoadingSpinner v-if="loading" :label="t('home.readingStars')" />

    <section v-if="horoscope && !loading" class="horoscope-section">
      <div class="overall-card glass-card">
        <p class="overall-eyebrow">{{ t('home.todayOverall') }}</p>
        <p class="overall-text">{{ horoscope.overall }}</p>
        <button type="button" class="share-reading-btn" :disabled="shareBusy" @click="shareTodayReading">
          {{ shareBusy ? t('home.sharePreparing') : t('home.shareTodayReading') }}
        </button>
        <button
          v-if="user"
          type="button"
          class="complete-ritual-btn"
          :disabled="completionBusy || horoscope.streakLastDate === horoscope.date"
          @click="completeTodayReading"
        >
          {{ completionBusy ? 'Confirming quietly...' : horoscope.streakLastDate === horoscope.date ? 'Today is in your rhythm' : 'Complete today’s ritual' }}
        </button>
        <p v-if="shareError" class="share-error" role="alert">{{ shareError }}</p>
        <p v-if="completionMessage" class="completion-message">{{ completionMessage }}</p>
        <p v-if="completionError" class="share-error" role="alert">{{ completionError }}</p>
      </div>

      <div class="prediction-grid">
        <PredictionCard :title="t('home.love')" icon="❤" accent="#ff6b9c" :body="horoscope.love" />
        <PredictionCard :title="t('home.career')" icon="♃" accent="#9ec6ff" :body="horoscope.career" />
        <PredictionCard :title="t('home.health')" icon="✚" accent="#7bbf6a" :body="horoscope.health" />
      </div>

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
  margin: 0.75rem 0 0;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: rgba(255, 90, 90, 0.12);
  border: 1px solid rgba(255, 120, 120, 0.35);
  color: #ffb4b4;
  font-size: 0.9rem;
}

.home-page {
  padding-top: 0.2rem;
}
.hero { text-align: center; margin-bottom: 2.5rem; }
.greeting {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 2px;
}
.title {
  font-family: var(--font-display);
  font-size: 2.4rem;
  font-weight: 700;
  margin: 0.4rem 0 0.2rem;
  letter-spacing: 1px;
}
.date { color: var(--text-secondary); font-size: 0.95rem; }
.big-sign {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  margin-top: 1.2rem;
  padding: 0.5rem 1.5rem;
  max-width: 100%;
  border-radius: 999px;
  background: var(--gold-glow);
  border: 1px solid var(--glass-border);
}
.big-sign-symbol { font-size: 1.6rem; color: var(--gold); }
.big-sign-name {
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.zodiac-strip { margin-bottom: 2.4rem; }
.section-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 0.9rem;
}
.zodiac-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}
@media (max-width: 720px) { .zodiac-grid { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 480px) { .zodiac-grid { grid-template-columns: repeat(3, 1fr); } }
.horoscope-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.overall-card {
  padding: 2rem;
  text-align: center;
}
.overall-eyebrow {
  font-size: 0.7rem;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 0.9rem;
}
.overall-text {
  font-family: var(--font-display);
  font-size: 1.4rem;
  line-height: 1.5;
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
.complete-ritual-btn {
  margin-top: 0.8rem;
  margin-left: 0.75rem;
  border: 1px solid rgba(167, 228, 196, 0.42);
  border-radius: 999px;
  background: rgba(167, 228, 196, 0.14);
  color: var(--text-primary);
  padding: 0.8rem 1.2rem;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}
.complete-ritual-btn:disabled {
  cursor: default;
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
.prediction-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
@media (max-width: 800px) { .prediction-grid { grid-template-columns: 1fr; } }
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
