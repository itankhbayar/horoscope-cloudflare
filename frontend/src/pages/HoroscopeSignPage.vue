<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';
import { useDocumentMeta } from '../composables/useDocumentMeta';
import { getZodiacInfo, ZODIAC_SIGNS } from '../lib/zodiac';
import type { ZodiacSign } from '../lib/types';

const route = useRoute();
const router = useRouter();

const copy: Record<ZodiacSign, { dates: string; intro: string; preview: string }> = {
  aries: {
    dates: 'Mar 21 - Apr 19',
    intro: 'Aries moves first, trusts momentum, and turns instinct into action.',
    preview: 'Today favors decisive conversations, brave prioritization, and cleaner boundaries around distractions.',
  },
  taurus: {
    dates: 'Apr 20 - May 20',
    intro: 'Taurus builds slowly, beautifully, and with staying power.',
    preview: 'Today highlights money, comfort, loyalty, and the routines that make your nervous system feel safe.',
  },
  gemini: {
    dates: 'May 21 - Jun 20',
    intro: 'Gemini thrives on pattern, wit, and discovery.',
    preview: 'Today brings focus to conversations, choices, and the signal hidden inside too much information.',
  },
  cancer: {
    dates: 'Jun 21 - Jul 22',
    intro: 'Cancer reads the emotional weather before anyone says a word.',
    preview: 'Today centers home, belonging, intuition, and the kind of softness that still has a spine.',
  },
  leo: {
    dates: 'Jul 23 - Aug 22',
    intro: 'Leo brings warmth, courage, and creative gravity.',
    preview: 'Today spotlights confidence, romance, creativity, and the moment where generosity becomes leadership.',
  },
  virgo: {
    dates: 'Aug 23 - Sep 22',
    intro: 'Virgo notices the detail that changes the whole system.',
    preview: 'Today focuses on work, wellness, organization, and the one improvement that makes everything easier.',
  },
  libra: {
    dates: 'Sep 23 - Oct 22',
    intro: 'Libra seeks harmony that is honest, not decorative.',
    preview: 'Today emphasizes partnership, aesthetics, diplomacy, and the balance between pleasing others and honoring yourself.',
  },
  scorpio: {
    dates: 'Oct 23 - Nov 21',
    intro: 'Scorpio sees beneath the surface and knows when something is ready to transform.',
    preview: 'Today points to trust, intimacy, release, and the power that returns when you stop negotiating with what is done.',
  },
  sagittarius: {
    dates: 'Nov 22 - Dec 21',
    intro: 'Sagittarius needs meaning, movement, and a horizon.',
    preview: 'Today highlights travel, learning, optimism, and the truth that wants to become a plan.',
  },
  capricorn: {
    dates: 'Dec 22 - Jan 19',
    intro: 'Capricorn understands time, effort, and earned confidence.',
    preview: 'Today supports structure, ambition, and progress you can actually measure.',
  },
  aquarius: {
    dates: 'Jan 20 - Feb 18',
    intro: 'Aquarius brings future-facing clarity and refuses stale patterns.',
    preview: 'Today spotlights friendship, innovation, independence, and the idea that becomes useful when shared.',
  },
  pisces: {
    dates: 'Feb 19 - Mar 20',
    intro: 'Pisces feels the invisible thread between dream, memory, and meaning.',
    preview: 'Today centers rest, creativity, compassion, and the quiet sign that tells you what your spirit already knows.',
  },
};

const signParam = computed(() => String(route.params.sign ?? '').toLowerCase());
const isKnownSign = computed(() => ZODIAC_SIGNS.some((sign) => sign.key === signParam.value));
const sign = computed<ZodiacSign>(() => (isKnownSign.value ? (signParam.value as ZodiacSign) : 'aries'));
const info = computed(() => getZodiacInfo(sign.value));
const signCopy = computed(() => copy[sign.value]);
const todayISO = new Date().toISOString().slice(0, 10);
const isTodayRoute = computed(() => route.path.endsWith('/today'));
const title = computed(() => `${info.value.name} Real Sky Reading Today (${todayISO}) | Astralis`);
const description = computed(
  () => `Read the ${todayISO} ${info.value.name} sky reading from Astralis, an astronomy-accurate astrology platform powered by real planetary positions and birthplace-aware charts.`,
);
const canonicalPath = computed(() => `/horoscope/${sign.value}${isTodayRoute.value ? '/today' : ''}`);

if (!isKnownSign.value) {
  router.replace('/horoscope/aries');
}

useDocumentMeta({
  title: title.value,
  description: description.value,
  canonicalPath: canonicalPath.value,
  type: 'article',
  imagePath: `/og/horoscope-${sign.value}.svg`,
});
</script>

<template>
  <AppContainer size="lg">
    <ScreenLayout class="horoscope-page">
      <article class="hero glass-card">
        <div>
          <p class="kicker">{{ signCopy.dates }} · {{ info.element }} sign</p>
          <h1>{{ info.name }} Real Sky Reading Today</h1>
          <p class="lede">{{ signCopy.intro }}</p>
        </div>
        <div class="sign-orb" aria-hidden="true">
          <span>{{ info.symbol }}</span>
        </div>
      </article>

      <section class="daily glass-card">
        <p class="kicker">Astronomy-accurate preview</p>
        <h2>What today asks of {{ info.name }}</h2>
        <p>{{ signCopy.preview }}</p>
        <p>
          Create your free Astralis chart for guidance shaped by your birth profile,
          calculated placements, the moving sky, and the horizon above your birthplace.
        </p>
      </section>

      <section class="grid">
        <article class="glass-card">
          <h2>Personal daily timing</h2>
          <p>Read daily themes through the current Sun, Moon, Moon phase, and your chart anchor.</p>
        </article>
        <article class="glass-card">
          <h2>Birth chart insight</h2>
          <p>Go beyond your sun sign with placements calculated from birth time, birthplace, and real planetary positions.</p>
        </article>
        <article class="glass-card">
          <h2>Compatibility</h2>
          <p>Compare relationship dynamics through chart-aware overlays, not generic templates.</p>
        </article>
      </section>

      <nav class="sign-links" aria-label="All zodiac horoscope pages">
        <router-link v-for="item in ZODIAC_SIGNS" :key="item.key" :to="`/horoscope/${item.key}`">
          {{ item.name }}
        </router-link>
      </nav>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.horoscope-page {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-7) 0;
}
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-5);
  padding: clamp(1.4rem, 5vw, 3rem);
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
  font-size: clamp(2.3rem, 8vw, 4.8rem);
  line-height: 1;
  margin: var(--space-2) 0;
}
h2 {
  font-size: clamp(1.35rem, 4vw, 2rem);
  margin-bottom: var(--space-2);
}
.lede,
p {
  color: var(--text-secondary);
  max-width: 72ch;
}
.sign-orb {
  width: clamp(7rem, 18vw, 12rem);
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 1px solid var(--glass-border-hover);
  background: radial-gradient(circle, rgba(212, 175, 55, 0.22), rgba(139, 107, 255, 0.12));
}
.sign-orb span {
  font-size: clamp(3.4rem, 10vw, 6rem);
  color: var(--gold-light);
}
.daily {
  padding: clamp(1.25rem, 4vw, 2rem);
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}
.grid article {
  padding: var(--space-5);
}
.grid p {
  margin: 0;
}
.sign-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.sign-links a {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  padding: 0 var(--space-3);
  color: var(--text-secondary);
  text-decoration: none;
}
.sign-links a.router-link-active {
  color: var(--gold-light);
  border-color: var(--glass-border-hover);
}
@media (max-width: 720px) {
  .hero,
  .grid {
    grid-template-columns: 1fr;
  }
  .sign-orb {
    justify-self: start;
  }
}
</style>
