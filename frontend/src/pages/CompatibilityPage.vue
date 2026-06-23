<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ZODIAC_SIGNS, getZodiacInfo } from '../lib/zodiac';
import type { ZodiacSign } from '../lib/types';
import { useCompatibility } from '../composables/useCompatibility';
import { useAuth } from '../composables/useAuth';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import GuestResultGate from '../components/GuestResultGate.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { buildCompatibilityShareCard } from '../lib/compatibilityShareCard';
import { compatibilityAnalyticsContext } from '../lib/compatibilityAnalytics';
import { createCompatibilityShareRef, isShareUserCancelled } from '../lib/compatibilityShareRef';
import { isValidShareImageFile, MIN_SHARE_IMAGE_BYTES, nativeShareWithImageFallback } from '../lib/webShare';
import { useShareSectionVisibleOnce } from '../composables/useShareSectionVisibleOnce';
import { track } from '../lib/analytics';

const { t, locale } = useI18n();
const { isAuthenticated } = useAuth();

const sign1 = ref<ZodiacSign>('leo');
const sign2 = ref<ZodiacSign>('aquarius');

const { result, loading, error, compareSigns, reset } = useCompatibility();
// Guests can pick signs and press compute, but the reading is held behind the gate.
const showGuestGate = ref(false);
const shareStatus = ref('');
const shareSectionRef = ref<HTMLElement | null>(null);

const sign1Info = computed(() => getZodiacInfo(sign1.value));
const sign2Info = computed(() => getZodiacInfo(sign2.value));
const shareCard = computed(() =>
  result.value
    ? buildCompatibilityShareCard(result.value, {
        locale: locale.value,
        sign1Name: t(`zodiac.${sign1Info.value.key}`),
        sign2Name: t(`zodiac.${sign2Info.value.key}`),
        appUrl: window.location.origin,
      })
    : null,
);

async function runCompare(): Promise<void> {
  if (!isAuthenticated.value) {
    showGuestGate.value = true;
    track('guest_result_gate_shown', { surface: 'compatibility' });
    return;
  }
  await compareSigns(sign1.value, sign2.value);
}

watch(locale, async () => {
  if (result.value) {
    await compareSigns(sign1.value, sign2.value);
  } else {
    reset();
  }
});

function trackShareCardViewed(): void {
  if (!result.value) return;
  track('compatibility_share_card_viewed', {
    surface: 'compatibility',
    ...compatibilityAnalyticsContext({
      locale: locale.value,
      sign1: result.value.sign1,
      sign2: result.value.sign2,
      sharedScore: result.value.overallScore,
    }),
    sign1: result.value.sign1,
    sign2: result.value.sign2,
    score: result.value.overallScore,
  });
}

const { reset: resetShareSectionVisibility } = useShareSectionVisibleOnce(shareSectionRef, trackShareCardViewed);

watch(result, (next) => {
  shareStatus.value = '';
  if (!next) return;
  resetShareSectionVisibility();
});

function scoreColor(score: number): string {
  if (score >= 80) return '#7bbf6a';
  if (score >= 60) return '#e8d48b';
  if (score >= 40) return '#ff8a5c';
  return '#ff6b6b';
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(/\s+/);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = word;
      if (lines >= maxLines) return y;
    } else {
      line = testLine;
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

async function renderShareImage(card: NonNullable<typeof shareCard.value>): Promise<File | null> {
  if (!result.value) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, '#111432');
  gradient.addColorStop(0.52, '#2b183e');
  gradient.addColorStop(1, '#071421');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 90; i += 1) {
    const x = (i * 97) % 1080;
    const y = (i * 211) % 1920;
    ctx.beginPath();
    ctx.arc(x, y, i % 3 === 0 ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const accent = scoreColor(result.value.overallScore);
  ctx.textAlign = 'center';

  // Brand + the pair, centered at the top.
  ctx.fillStyle = '#f4d57a';
  ctx.font = '700 38px Georgia, serif';
  ctx.fillText('ASTRALIS', 540, 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 78px Georgia, serif';
  wrapCanvasText(ctx, card.pairLabel, 540, 282, 920, 90, 2);

  // Score ring: faint full track + accent arc swept to the score.
  const cx = 540;
  const cy = 690;
  const radius = 152;
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * result.value.overallScore) / 100);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = '700 120px Georgia, serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${result.value.overallScore}%`, cx, cy + 8);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#b8bdd7';
  ctx.font = '500 34px Arial, sans-serif';
  ctx.fillText(t('compatibility.overallHarmony').toUpperCase(), 540, 928);

  // Theme title + summary.
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 60px Georgia, serif';
  const afterTitle = wrapCanvasText(ctx, card.themeTitle, 540, 1024, 920, 72, 2);
  ctx.fillStyle = '#d8d8ea';
  ctx.font = '400 40px Arial, sans-serif';
  wrapCanvasText(ctx, card.themeSummary, 540, afterTitle + 24, 920, 56, 3);

  // Metric bars across the bottom.
  const bx = 110;
  const bw = 860;
  let by = 1500;
  const metrics: Array<[string, number]> = [
    [t('compatibility.love'), result.value.loveScore],
    [t('compatibility.friendship'), result.value.friendshipScore],
    [t('compatibility.communication'), result.value.communicationScore],
  ];
  for (const [label, value] of metrics) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cdd2ea';
    ctx.font = '600 30px Arial, sans-serif';
    ctx.fillText(label.toUpperCase(), bx, by);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f4d57a';
    ctx.fillText(`${value}%`, bx + bw, by);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.roundRect(bx, by + 18, bw, 12, 6);
    ctx.fill();
    ctx.fillStyle = scoreColor(value);
    ctx.roundRect(bx, by + 18, (bw * value) / 100, 12, 6);
    ctx.fill();
    by += 92;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#b8bdd7';
  ctx.font = '400 30px Arial, sans-serif';
  ctx.fillText('astralis.app', 540, 1850);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value && value.size >= MIN_SHARE_IMAGE_BYTES ? value : null), 'image/png', 0.92);
  });
  const pairSlug = `${result.value.sign1}-${result.value.sign2}`.toLowerCase();
  return blob ? new File([blob], `astralis-compatibility-${pairSlug}.png`, { type: 'image/png' }) : null;
}

function buildShareAttempt(): {
  shareRef: string;
  card: NonNullable<typeof shareCard.value>;
  props: Record<string, string | number>;
} | null {
  if (!result.value) return null;
  const shareRef = createCompatibilityShareRef();
  const card = buildCompatibilityShareCard(result.value, {
    locale: locale.value,
    sign1Name: t(`zodiac.${sign1Info.value.key}`),
    sign2Name: t(`zodiac.${sign2Info.value.key}`),
    appUrl: window.location.origin,
    shareRef,
  });
  const props = {
    surface: 'compatibility',
    ...compatibilityAnalyticsContext({
      locale: locale.value,
      sign1: result.value.sign1,
      sign2: result.value.sign2,
      sharedScore: result.value.overallScore,
      shareRef,
    }),
    sign1: result.value.sign1,
    sign2: result.value.sign2,
    score: result.value.overallScore,
    share_ref: shareRef,
  };
  return { shareRef, card, props };
}

async function shareCompatibility(): Promise<void> {
  const attempt = buildShareAttempt();
  if (!attempt) return;
  const { card, props } = attempt;
  track('compatibility_share_cta_clicked', props);
  track('compatibility_share_link_created', props);
  try {
    const image = await renderShareImage(card);
    const nativeShare = (navigator as Navigator & { share?: Navigator['share'] }).share;
    if (typeof nativeShare === 'function') {
      const outcome = await nativeShareWithImageFallback(navigator, {
        title: card.pairLabel,
        text: card.shareText,
        file: isValidShareImageFile(image) ? image : null,
        url: card.shareUrl,
      });
      track('compatibility_share_completed', {
        ...props,
        method: outcome === 'file' ? 'native_image' : 'native',
      });
      shareStatus.value = t('compatibility.shareDone');
      return;
    }
    await navigator.clipboard.writeText(card.shareText);
    track('compatibility_share_completed', { ...props, method: 'clipboard' });
    shareStatus.value = t('compatibility.shareCopied');
  } catch (err) {
    if (isShareUserCancelled(err)) {
      track('compatibility_share_cancelled', props);
      shareStatus.value = '';
      return;
    }
    const reason = err instanceof Error ? err.message : 'unknown';
    track('compatibility_share_failed', { ...props, reason });
    shareStatus.value = t('compatibility.shareFailed');
  }
}
</script>

<template>
  <AppContainer size="lg">
    <ScreenLayout class="compat-page">
    <header class="page-head">
      <h1>{{ t('compatibility.title') }}</h1>
      <p>{{ t('compatibility.subtitle') }}</p>
    </header>

    <section class="compare-card glass-card">
      <div class="picker">
        <div class="sign-pick">
          <span class="sign-pick-glyph" aria-hidden="true">{{ sign1Info.symbol }}</span>
          <label class="sign-pick-field">
            <span class="label">{{ t('compatibility.firstSign') }}</span>
            <select v-model="sign1" class="form-input">
              <option v-for="sign in ZODIAC_SIGNS" :key="sign.key" :value="sign.key">
                {{ sign.symbol }} {{ t(`zodiac.${sign.key}`) }}
              </option>
            </select>
          </label>
        </div>
        <span class="vs" aria-hidden="true">❤</span>
        <div class="sign-pick">
          <span class="sign-pick-glyph" aria-hidden="true">{{ sign2Info.symbol }}</span>
          <label class="sign-pick-field">
            <span class="label">{{ t('compatibility.secondSign') }}</span>
            <select v-model="sign2" class="form-input">
              <option v-for="sign in ZODIAC_SIGNS" :key="sign.key" :value="sign.key">
                {{ sign.symbol }} {{ t(`zodiac.${sign.key}`) }}
              </option>
            </select>
          </label>
        </div>
      </div>
      <button class="btn-compact compare-btn" @click="runCompare" :disabled="loading">
        <span v-if="loading">✨ {{ t('compatibility.aligning') }}</span>
        <span v-else>{{ t('compatibility.compute') }}</span>
      </button>
    </section>

    <GuestResultGate v-if="showGuestGate" :message="t('guestGate.compatibilityTitle')" />

    <LoadingSpinner v-if="loading" />

    <section v-if="result && !loading" class="result-section">
      <div class="result-hero glass-card">
        <div class="couple">
          <div class="sign-portrait">
            <span class="sign-symbol">{{ sign1Info.symbol }}</span>
            <span class="sign-name">{{ t(`zodiac.${sign1Info.key}`) }}</span>
          </div>
          <span class="heart">❤</span>
          <div class="sign-portrait">
            <span class="sign-symbol">{{ sign2Info.symbol }}</span>
            <span class="sign-name">{{ t(`zodiac.${sign2Info.key}`) }}</span>
          </div>
        </div>
        <div class="overall-score" :style="{ color: scoreColor(result.overallScore) }">
          {{ result.overallScore }}<span class="percent">%</span>
        </div>
        <p class="overall-label">{{ t('compatibility.overallHarmony') }}</p>
        <p class="summary">{{ result.summary }}</p>
      </div>

      <div class="metrics">
        <div class="metric glass-card" v-for="metric in [
          { label: t('compatibility.love'), value: result.loveScore, icon: '❤' },
          { label: t('compatibility.friendship'), value: result.friendshipScore, icon: '✨' },
          { label: t('compatibility.communication'), value: result.communicationScore, icon: '☿' },
        ]" :key="metric.label">
          <p class="metric-label">{{ metric.icon }} {{ metric.label }}</p>
          <div class="bar">
            <div class="fill" :style="{ width: `${metric.value}%`, background: scoreColor(metric.value) }"></div>
          </div>
          <p class="metric-value">{{ metric.value }}%</p>
        </div>
      </div>

      <div class="highlights glass-card">
        <h3>{{ t('compatibility.highlights') }}</h3>
        <ul>
          <li v-for="(h, i) in result.highlights" :key="i">{{ h }}</li>
        </ul>
      </div>

      <section v-if="shareCard" ref="shareSectionRef" class="share-section">
        <div class="story-card" aria-label="Compatibility share card preview">
          <div class="story-stars" aria-hidden="true"></div>

          <div class="story-head">
            <p class="story-brand">Astralis</p>
            <div class="story-couple">
              <span class="story-glyph">{{ sign1Info.symbol }}</span>
              <span class="story-amp">&</span>
              <span class="story-glyph">{{ sign2Info.symbol }}</span>
            </div>
            <strong class="story-names">{{ shareCard.pairLabel }}</strong>
          </div>

          <div class="story-core">
            <div
              class="story-score-ring"
              :style="{ '--ring': scoreColor(result.overallScore) }"
            >
              <span class="story-score-num">{{ result.overallScore }}<span class="story-score-pct">%</span></span>
            </div>
            <p class="story-score-cap">{{ t('compatibility.overallHarmony') }}</p>
            <h3 class="story-title">{{ shareCard.themeTitle }}</h3>
            <p class="story-sum">{{ shareCard.themeSummary }}</p>
          </div>

          <div class="story-foot">
            <div class="story-bars">
              <div
                v-for="m in [
                  { label: t('compatibility.love'), value: result.loveScore },
                  { label: t('compatibility.friendship'), value: result.friendshipScore },
                  { label: t('compatibility.communication'), value: result.communicationScore },
                ]"
                :key="m.label"
                class="story-bar"
              >
                <span class="story-bar-head">
                  <span class="story-bar-label">{{ m.label }}</span>
                  <span class="story-bar-val">{{ m.value }}%</span>
                </span>
                <span class="story-bar-track">
                  <span class="story-bar-fill" :style="{ width: `${m.value}%`, background: scoreColor(m.value) }" />
                </span>
              </div>
            </div>
            <p class="story-url">astralis.app</p>
          </div>
        </div>
        <div class="share-copy glass-card">
          <p class="preview-kicker">{{ t('compatibility.shareEyebrow') }}</p>
          <h3>{{ t('compatibility.shareTitle') }}</h3>
          <p>{{ t('compatibility.shareBody') }}</p>
          <button type="button" class="btn-celestial" @click="shareCompatibility">
            {{ t('compatibility.shareButton') }}
          </button>
          <p v-if="shareStatus" class="share-status" role="status">{{ shareStatus }}</p>
        </div>
      </section>
    </section>

    <p v-if="error" class="error-msg">{{ error }}</p>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.compat-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.page-head { text-align: center; }
.page-head h1 {
  font-family: var(--font-display);
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 0.4rem;
}
.page-head p { color: var(--text-muted); }
.compare-card {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.picker {
  display: flex;
  align-items: flex-start;
  gap: 1.1rem;
}
.sign-pick {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
}
.sign-pick-glyph {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: var(--gold-glow);
  color: var(--gold);
  font-size: 2rem;
  line-height: 1;
  filter: drop-shadow(0 0 14px var(--gold-dim));
}
.sign-pick-field {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}
.sign-pick-field .form-input {
  width: 100%;
  text-align: center;
  text-align-last: center;
}
@media (max-width: 560px) {
  .vs {
    text-align: center;
  }
}
.label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-muted);
}
.vs {
  color: #ff6b9c;
  font-size: 1.6rem;
  flex: 0 0 auto;
  margin-top: 18px;
}
.compare-btn { align-self: center; }
.result-section {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.result-hero {
  padding: 2rem;
  text-align: center;
}
.couple {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}
@media (max-width: 520px) {
  .couple {
    gap: 1rem;
  }
  .sign-symbol {
    font-size: 2.6rem;
  }
}
.sign-portrait { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
.sign-symbol {
  font-size: 3.5rem;
  color: var(--gold);
  filter: drop-shadow(0 0 18px var(--gold-dim));
}
.sign-name { font-family: var(--font-display); font-size: 1.1rem; }
.heart { font-size: 1.6rem; color: #ff6b9c; }
.overall-score {
  font-family: var(--font-display);
  font-size: 4.5rem;
  font-weight: 600;
  line-height: 1;
}
.percent { font-size: 1.8rem; opacity: 0.7; margin-left: 0.2rem; }
.overall-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-muted);
  margin: 0.4rem 0 1rem;
}
.summary {
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--text-secondary);
  font-style: italic;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
@media (max-width: 800px) { .metrics { grid-template-columns: 1fr; } }
.metric {
  padding: 1.3rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.metric-label { font-size: 0.85rem; color: var(--text-secondary); }
.bar { height: 8px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; }
.fill { height: 100%; transition: width 0.6s ease; }
.metric-value {
  text-align: right;
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--gold-light);
}
.highlights {
  padding: 1.6rem;
}
.highlights h3 {
  font-family: var(--font-display);
  font-size: 1.1rem;
  margin-bottom: 0.8rem;
  color: var(--text-primary);
}
.highlights ul { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
.highlights li {
  padding: 0.7rem 0.9rem;
  background: rgba(255,255,255,0.03);
  border-left: 2px solid var(--gold);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.share-section {
  display: grid;
  grid-template-columns: minmax(240px, 360px) minmax(0, 1fr);
  gap: 1.2rem;
  align-items: center;
}
.story-card {
  position: relative;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  border: 1px solid rgba(244, 213, 122, 0.32);
  border-radius: 8px;
  padding: clamp(1rem, 4vw, 1.5rem);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
  background:
    radial-gradient(circle at 20% 12%, rgba(244, 213, 122, 0.22), transparent 24%),
    radial-gradient(circle at 88% 38%, rgba(255, 107, 156, 0.2), transparent 22%),
    linear-gradient(160deg, #111432 0%, #2b183e 54%, #071421 100%);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.32);
}
.story-stars {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.38) 1px, transparent 1.5px),
    radial-gradient(circle, rgba(244,213,122,0.32) 1px, transparent 1.5px);
  background-position: 0 0, 24px 40px;
  background-size: 72px 92px, 120px 140px;
  opacity: 0.42;
}
.story-card > *:not(.story-stars) {
  position: relative;
}
.story-brand,
.preview-kicker {
  color: var(--gold-light);
  font-size: var(--text-xs);
  letter-spacing: 1.6px;
  text-transform: uppercase;
}
/* --- Share story card: head / core / foot stacked across the 9:16 frame --- */
.story-head,
.story-core,
.story-foot {
  display: flex;
  flex-direction: column;
}
.story-head {
  align-items: center;
  gap: 0.5rem;
}
.story-couple {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.story-glyph {
  color: var(--gold-light);
  font-size: clamp(2rem, 8vw, 3rem);
  line-height: 1;
  filter: drop-shadow(0 0 14px rgba(244, 213, 122, 0.45));
}
.story-amp {
  color: rgba(255, 255, 255, 0.5);
  font-size: clamp(1.1rem, 4vw, 1.6rem);
}
.story-names {
  font-family: var(--font-display);
  font-size: clamp(1.3rem, 5vw, 2rem);
  line-height: 1.1;
  text-align: center;
}
.story-core {
  align-items: center;
  gap: 0.55rem;
  text-align: center;
}
.story-score-ring {
  width: clamp(120px, 38%, 168px);
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 3px solid var(--ring, var(--gold));
  background: radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--ring, var(--gold)) 26%, transparent), transparent 70%);
  box-shadow: 0 0 28px color-mix(in srgb, var(--ring, var(--gold)) 38%, transparent);
  margin-bottom: 0.2rem;
}
.story-score-num {
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 11vw, 3.6rem);
  font-weight: 700;
  line-height: 1;
  color: var(--ring, var(--gold));
}
.story-score-pct {
  font-size: 0.45em;
  opacity: 0.75;
  margin-left: 0.05em;
}
.story-score-cap {
  font-size: var(--text-xs);
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}
.story-title {
  font-family: var(--font-display);
  font-size: clamp(1.25rem, 5vw, 1.9rem);
  line-height: 1.1;
  margin-top: 0.15rem;
}
.story-sum {
  color: rgba(255, 255, 255, 0.82);
  font-size: var(--text-sm);
  line-height: 1.45;
}
.story-foot {
  gap: 0.9rem;
}
.story-bars {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.story-bar {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.story-bar-head {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  letter-spacing: 0.6px;
}
.story-bar-label {
  color: rgba(255, 255, 255, 0.75);
  text-transform: uppercase;
}
.story-bar-val {
  color: var(--gold-light);
  font-weight: 700;
}
.story-bar-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.story-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
}
.story-url {
  text-align: center;
  font-size: var(--text-xs);
  letter-spacing: 1.4px;
  color: rgba(255, 255, 255, 0.55);
}
.share-copy {
  align-self: stretch;
  padding: 1.9rem 1.7rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.7rem;
}
.share-copy h3 {
  font-family: var(--font-display);
  color: var(--text-primary);
  font-size: 1.55rem;
  line-height: 1.2;
  margin: 0;
}
.share-copy p {
  color: var(--text-secondary);
  line-height: 1.55;
  margin: 0;
}
.share-copy .btn-celestial {
  margin-top: 0.65rem;
  width: 100%;
}
.share-status {
  margin-top: 0.1rem;
  color: var(--gold-light);
  text-align: center;
}
@media (max-width: 760px) {
  .share-section {
    grid-template-columns: 1fr;
  }
  .story-card {
    width: min(100%, 340px);
    justify-self: center;
  }
}
</style>
