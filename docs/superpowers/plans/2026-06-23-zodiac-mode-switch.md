# Western/Chinese Zodiac Mode Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted navbar toggle that flips the web app between Western Astrology and Chinese Zodiac, reshaping the navbar so each mode's feature pages show that system's readings.

**Architecture:** Frontend-only (Vue 3 + Pinia). A `zodiacMode` Pinia store (persisted via the existing `getStorage()` abstraction) drives a mode-aware navbar. Chinese mode gets dedicated routes (`/chinese/today`, `/chinese/chart`, existing `/chinese/compatibility`). A pure route-mapping helper sends the user to the counterpart page when they toggle. The combined `ChineseZodiacPage.vue` is split into a daily-readings page and a birth-chart page. All Chinese backend services already exist and are reused unchanged.

**Tech Stack:** Vue 3 (`<script setup>`), Pinia, vue-router, vue-i18n, Vitest. Existing libs: `chineseHoroscopeService`, `chineseCompatibilityService`, `chineseZodiac` helpers, `getStorage`.

## Global Constraints

- Platform: **web only** (`frontend/`). Do not touch `backend/`, `mobile/`, `shared/`, DB, or cron.
- Chinese mode nav items: **Today, Compatibility, Birth Chart**. **No Tarot in Chinese mode.**
- Premium and Profile appear in **both** modes (Profile only when authenticated, matching current behavior).
- Mode persists across reloads/visits via `getStorage()` (key `astralis_zodiac_mode_v1`), default `'western'`.
- Toggling on Premium/Profile (mode-agnostic pages) **stays on the page** (does not navigate). (Spec O1)
- Keep the now-unused `nav.chineseZodiac` i18n key (do not delete). (Spec O2)
- Every i18n change updates **both** `en.json` and `mn.json`; `npm run verify:locales` must pass.
- Use `getStorage()` (from `src/lib/storage.ts`), never `window.localStorage` directly.
- Run all commands from `frontend/` unless noted. Commit after each task.

---

### Task 1: Route-mapping helper (`zodiacModeRoutes`)

Pure functions + the shared `ZodiacMode` type. No Vue/Pinia dependency, fully unit-tested.

**Files:**
- Create: `frontend/src/lib/zodiacModeRoutes.ts`
- Test: `frontend/src/lib/zodiacModeRoutes.test.ts`

**Interfaces:**
- Produces:
  - `type ZodiacMode = 'western' | 'chinese'`
  - `function resolveModeNavigation(currentPath: string, targetMode: ZodiacMode): string | null`
    — returns the path to navigate to when switching to `targetMode`, or `null` to stay put.
  - `const ZODIAC_TODAY: Record<ZodiacMode, string>` (`{ western: '/today', chinese: '/chinese/today' }`)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/zodiacModeRoutes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveModeNavigation, ZODIAC_TODAY } from './zodiacModeRoutes';

describe('resolveModeNavigation', () => {
  it('maps western feature pages to their chinese counterparts', () => {
    expect(resolveModeNavigation('/today', 'chinese')).toBe('/chinese/today');
    expect(resolveModeNavigation('/compatibility', 'chinese')).toBe('/chinese/compatibility');
    expect(resolveModeNavigation('/chart', 'chinese')).toBe('/chinese/chart');
  });

  it('maps chinese feature pages back to their western counterparts', () => {
    expect(resolveModeNavigation('/chinese/today', 'western')).toBe('/today');
    expect(resolveModeNavigation('/chinese/compatibility', 'western')).toBe('/compatibility');
    expect(resolveModeNavigation('/chinese/chart', 'western')).toBe('/chart');
  });

  it('sends western-only Tarot to the target mode Today when going Chinese', () => {
    expect(resolveModeNavigation('/tarot', 'chinese')).toBe('/chinese/today');
  });

  it('stays put on mode-agnostic pages (Premium, Profile)', () => {
    expect(resolveModeNavigation('/premium', 'chinese')).toBeNull();
    expect(resolveModeNavigation('/profile', 'chinese')).toBeNull();
    expect(resolveModeNavigation('/premium', 'western')).toBeNull();
  });

  it('stays put on unknown/deep-link pages', () => {
    expect(resolveModeNavigation('/horoscope/aries', 'chinese')).toBeNull();
    expect(resolveModeNavigation('/privacy', 'western')).toBeNull();
  });

  it('exposes the Today path per mode', () => {
    expect(ZODIAC_TODAY.western).toBe('/today');
    expect(ZODIAC_TODAY.chinese).toBe('/chinese/today');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/zodiacModeRoutes.test.ts`
Expected: FAIL — `Failed to resolve import './zodiacModeRoutes'` / module not found.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/zodiacModeRoutes.ts`:

```ts
export type ZodiacMode = 'western' | 'chinese';

/** The "Today" (daily reading) landing path for each mode. */
export const ZODIAC_TODAY: Record<ZodiacMode, string> = {
  western: '/today',
  chinese: '/chinese/today',
};

/**
 * Feature pages that have a 1:1 counterpart in the other mode. Keyed by the mode
 * the path belongs to, mapping that path to its sibling in the opposite mode.
 */
const COUNTERPARTS: Record<ZodiacMode, Record<string, string>> = {
  western: {
    '/today': '/chinese/today',
    '/compatibility': '/chinese/compatibility',
    '/chart': '/chinese/chart',
  },
  chinese: {
    '/chinese/today': '/today',
    '/chinese/compatibility': '/compatibility',
    '/chinese/chart': '/chart',
  },
};

/** Pages that exist only in Western mode and have no Chinese counterpart. */
const WESTERN_ONLY_FEATURES = new Set<string>(['/tarot']);

/**
 * Where to go when switching to `targetMode` from `currentPath`.
 * - A feature page with a counterpart → that counterpart.
 * - A western-only feature (e.g. Tarot) when switching to Chinese → Chinese Today.
 * - Anything else (Premium, Profile, marketing, deep links) → null = stay put.
 */
export function resolveModeNavigation(
  currentPath: string,
  targetMode: ZodiacMode,
): string | null {
  const fromMode: ZodiacMode = targetMode === 'western' ? 'chinese' : 'western';
  const counterpart = COUNTERPARTS[fromMode][currentPath];
  if (counterpart) return counterpart;
  if (targetMode === 'chinese' && WESTERN_ONLY_FEATURES.has(currentPath)) {
    return ZODIAC_TODAY.chinese;
  }
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/zodiacModeRoutes.test.ts`
Expected: PASS (6 passing).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/zodiacModeRoutes.ts frontend/src/lib/zodiacModeRoutes.test.ts
git commit -m "feat(web): add zodiac mode route-mapping helper"
```

---

### Task 2: Zodiac mode Pinia store

Holds the current mode, hydrates from and persists to storage, and is wired into app bootstrap.

**Files:**
- Create: `frontend/src/stores/zodiacMode.ts`
- Test: `frontend/src/stores/zodiacMode.test.ts`
- Modify: `frontend/src/stores/index.ts`
- Modify: `frontend/src/main.ts`

**Interfaces:**
- Consumes: `ZodiacMode` from `src/lib/zodiacModeRoutes` (Task 1); `getStorage`, `setStorage`, `KeyValueStorage` from `src/lib/storage`.
- Produces: `useZodiacModeStore()` exposing `mode: Ref<ZodiacMode>`, `hydrate(): Promise<void>`, `setMode(next: ZodiacMode): Promise<void>`, `toggle(): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/stores/zodiacMode.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useZodiacModeStore } from './zodiacMode';
import { setStorage, type KeyValueStorage } from '../lib/storage';

function memoryStorage(initial: Record<string, string> = {}): {
  storage: KeyValueStorage;
  dump: () => Record<string, string>;
} {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    storage: {
      async getItem(key) {
        return map.has(key) ? (map.get(key) as string) : null;
      },
      async setItem(key, value) {
        map.set(key, value);
      },
      async removeItem(key) {
        map.delete(key);
      },
    },
    dump: () => Object.fromEntries(map),
  };
}

describe('useZodiacModeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('defaults to western', () => {
    setStorage(memoryStorage().storage);
    const store = useZodiacModeStore();
    expect(store.mode).toBe('western');
  });

  it('hydrates a persisted mode', async () => {
    setStorage(memoryStorage({ astralis_zodiac_mode_v1: 'chinese' }).storage);
    const store = useZodiacModeStore();
    await store.hydrate();
    expect(store.mode).toBe('chinese');
  });

  it('ignores and clears an invalid persisted value', async () => {
    const mem = memoryStorage({ astralis_zodiac_mode_v1: 'bogus' });
    setStorage(mem.storage);
    const store = useZodiacModeStore();
    await store.hydrate();
    expect(store.mode).toBe('western');
    expect(mem.dump().astralis_zodiac_mode_v1).toBeUndefined();
  });

  it('setMode updates and persists', async () => {
    const mem = memoryStorage();
    setStorage(mem.storage);
    const store = useZodiacModeStore();
    await store.setMode('chinese');
    expect(store.mode).toBe('chinese');
    expect(mem.dump().astralis_zodiac_mode_v1).toBe('chinese');
  });

  it('toggle flips between modes', async () => {
    setStorage(memoryStorage().storage);
    const store = useZodiacModeStore();
    await store.toggle();
    expect(store.mode).toBe('chinese');
    await store.toggle();
    expect(store.mode).toBe('western');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/stores/zodiacMode.test.ts`
Expected: FAIL — cannot resolve `./zodiacMode`.

- [ ] **Step 3: Write the store**

Create `frontend/src/stores/zodiacMode.ts`:

```ts
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { getStorage } from '../lib/storage';
import type { ZodiacMode } from '../lib/zodiacModeRoutes';

const MODE_KEY = 'astralis_zodiac_mode_v1';

export const useZodiacModeStore = defineStore('zodiacMode', () => {
  const mode = ref<ZodiacMode>('western');

  async function hydrate(): Promise<void> {
    const raw = await getStorage().getItem(MODE_KEY);
    if (raw === 'western' || raw === 'chinese') {
      mode.value = raw;
    } else if (raw !== null) {
      await getStorage().removeItem(MODE_KEY);
    }
  }

  async function setMode(next: ZodiacMode): Promise<void> {
    mode.value = next;
    await getStorage().setItem(MODE_KEY, next);
  }

  async function toggle(): Promise<void> {
    await setMode(mode.value === 'western' ? 'chinese' : 'western');
  }

  return { mode, hydrate, setMode, toggle };
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/stores/zodiacMode.test.ts`
Expected: PASS (5 passing).

- [ ] **Step 5: Export the store and hydrate it at bootstrap**

In `frontend/src/stores/index.ts`, add the export (keep alphabetical-ish ordering after `useUserProfileStore`):

```ts
export { useUserProfileStore } from './userProfile';
export { useZodiacModeStore } from './zodiacMode';
```

In `frontend/src/main.ts`, import the store and hydrate it next to the existing settings hydrate. Change the import line:

```ts
import { useAppSettingsStore, useZodiacModeStore } from './stores';
```

and immediately after the existing `void useAppSettingsStore().hydrate(initialLocale);` line add:

```ts
void useZodiacModeStore().hydrate();
```

- [ ] **Step 6: Verify typecheck + tests pass**

Run: `npm run type-check && npx vitest run src/stores/zodiacMode.test.ts`
Expected: type-check succeeds; tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/stores/zodiacMode.ts frontend/src/stores/zodiacMode.test.ts frontend/src/stores/index.ts frontend/src/main.ts
git commit -m "feat(web): add persisted zodiacMode store"
```

---

### Task 3: Mode toggle component + i18n labels

A segmented Western/Chinese control. On selection it persists the mode and navigates to the counterpart page (or stays put).

**Files:**
- Create: `frontend/src/components/ZodiacModeToggle.vue`
- Modify: `frontend/src/i18n/locales/en.json`
- Modify: `frontend/src/i18n/locales/mn.json`

**Interfaces:**
- Consumes: `useZodiacModeStore` (Task 2); `resolveModeNavigation`, `ZodiacMode` (Task 1); `useRoute`, `useRouter`; `useI18n`.
- Produces: default-exported Vue component `<ZodiacModeToggle />` (no props).

- [ ] **Step 1: Add i18n keys (both locales)**

In `frontend/src/i18n/locales/en.json`, add a top-level `"zodiacMode"` block (place it right after the `"nav"` block's closing `},`):

```json
  "zodiacMode": {
    "toggleLabel": "Zodiac system",
    "western": "Western",
    "chinese": "Chinese"
  },
```

In `frontend/src/i18n/locales/mn.json`, add the matching block in the same position:

```json
  "zodiacMode": {
    "toggleLabel": "Зурхайн систем",
    "western": "Барууны",
    "chinese": "Жилийн орд"
  },
```

- [ ] **Step 2: Verify locale parity**

Run: `npm run verify:locales`
Expected: PASS (en/mn keys match).

- [ ] **Step 3: Create the component**

Create `frontend/src/components/ZodiacModeToggle.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useZodiacModeStore } from '../stores';
import { resolveModeNavigation, type ZodiacMode } from '../lib/zodiacModeRoutes';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const zodiacMode = useZodiacModeStore();

const options = computed<{ key: ZodiacMode; label: string; icon: string }[]>(() => [
  { key: 'western', label: t('zodiacMode.western'), icon: '☀' },
  { key: 'chinese', label: t('zodiacMode.chinese'), icon: '☯' },
]);

async function choose(next: ZodiacMode): Promise<void> {
  if (next === zodiacMode.mode) return;
  await zodiacMode.setMode(next);
  const dest = resolveModeNavigation(route.path, next);
  if (dest && dest !== route.path) await router.push(dest);
}
</script>

<template>
  <div class="zmode" role="group" :aria-label="t('zodiacMode.toggleLabel')">
    <button
      v-for="opt in options"
      :key="opt.key"
      type="button"
      class="zmode-btn"
      :class="{ active: opt.key === zodiacMode.mode }"
      :aria-pressed="opt.key === zodiacMode.mode"
      @click="choose(opt.key)"
    >
      <span class="zmode-icon" aria-hidden="true">{{ opt.icon }}</span>
      <span class="zmode-label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.zmode {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.18rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.zmode-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  min-height: 2rem;
  padding: 0 0.7rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.78rem;
  letter-spacing: 0.2px;
  transition: color 0.2s ease, background 0.2s ease;
}
.zmode-btn:hover {
  color: var(--gold-light);
}
.zmode-btn.active {
  color: #151326;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
  box-shadow: 0 6px 18px rgba(212, 175, 55, 0.18);
}
.zmode-btn:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
.zmode-icon {
  font-size: 0.9rem;
}
@media (max-width: 980px) {
  .zmode-label {
    display: none;
  }
  .zmode-btn {
    padding: 0 0.55rem;
  }
}
</style>
```

- [ ] **Step 4: Verify the component typechecks**

Run: `npm run type-check`
Expected: PASS (no errors). The component is not yet rendered anywhere — that happens in Task 6.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ZodiacModeToggle.vue frontend/src/i18n/locales/en.json frontend/src/i18n/locales/mn.json
git commit -m "feat(web): add zodiac mode toggle component"
```

---

### Task 4: Split Chinese pages — Daily + Birth Chart

Create the two focused Chinese pages and their i18n keys. The old `ChineseZodiacPage.vue` stays in place (still routed) until Task 5, so the app keeps building.

**Files:**
- Create: `frontend/src/pages/ChineseDailyPage.vue`
- Create: `frontend/src/pages/ChineseChartPage.vue`
- Modify: `frontend/src/i18n/locales/en.json`
- Modify: `frontend/src/i18n/locales/mn.json`

**Interfaces:**
- Consumes: `chineseHoroscopeService`, `CHINESE_ANIMAL_ORDER`, `getChineseAnimalInfo`, `chineseElementColor` from `../lib`; `ChineseAnimal`, `ChineseProfile`, `PeriodType` from `../lib/types`; `useAuth`; `LoadingSpinner`, `AppContainer`.
- Produces: default-exported components `ChineseDailyPage` and `ChineseChartPage`, mounted by the router in Task 5.

- [ ] **Step 1: Add i18n keys (both locales)**

In `frontend/src/i18n/locales/en.json`, add these keys **inside the existing `"chineseZodiac"` object** (e.g. right after `"openCompatibility"`):

```json
    "chartTitle": "Your Lunar Birth Chart",
    "chartSubtitle": "Your birth-year animal, its elements and polarity, and the signs it harmonizes with.",
    "trineGroup": "Trine group",
    "secretFriend": "Secret friend",
    "conflictAnimal": "Clashing animal",
    "dailyTitle": "Lunar Zodiac Readings",
    "dailySubtitle": "Daily, weekly, monthly and yearly guidance for your animal sign.",
```

In `frontend/src/i18n/locales/mn.json`, add inside its `"chineseZodiac"` object:

```json
    "chartTitle": "Таны жилийн төрсөн зурхай",
    "chartSubtitle": "Таны төрсөн жилийн амьтан, түүний махбод, эр/эм чанар, зохицдог тэмдгүүд.",
    "trineGroup": "Гурвалжин бүлэг",
    "secretFriend": "Нууц анд",
    "conflictAnimal": "Зөрчилт амьтан",
    "dailyTitle": "Жилийн ордын зурхай",
    "dailySubtitle": "Таны жилийн амьтны өдөр, долоо хоног, сар, жилийн зурхай.",
```

- [ ] **Step 2: Verify locale parity**

Run: `npm run verify:locales`
Expected: PASS.

- [ ] **Step 3: Create the Chinese daily page**

Create `frontend/src/pages/ChineseDailyPage.vue` (animal picker + period tabs + reading; profile is used only to preselect the animal):

```vue
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { chineseHoroscopeService, CHINESE_ANIMAL_ORDER, getChineseAnimalInfo } from '../lib';
import type { ChineseAnimal, PeriodType } from '../lib/types';
import { useAuth } from '../composables/useAuth';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import AppContainer from '../components/layout/AppContainer.vue';

const { t, locale } = useI18n();
const { isAuthenticated } = useAuth();
const router = useRouter();

type Period = 'daily' | PeriodType;

interface Reading {
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
}

const selectedAnimal = ref<ChineseAnimal>('dragon');
const period = ref<Period>('daily');
const reading = ref<Reading | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const animals = CHINESE_ANIMAL_ORDER;
const periods: Period[] = ['daily', 'weekly', 'monthly', 'yearly'];

function animalName(animal: ChineseAnimal): string {
  return t(`chineseZodiac.animals.${animal}`);
}
function animalEmoji(animal: ChineseAnimal): string {
  return getChineseAnimalInfo(animal).emoji;
}

async function loadReading(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    reading.value = period.value === 'daily'
      ? await chineseHoroscopeService.fetchChineseDaily(selectedAnimal.value)
      : await chineseHoroscopeService.fetchChinesePeriod(selectedAnimal.value, period.value);
  } catch (err) {
    error.value = (err as Error).message;
    reading.value = null;
  } finally {
    loading.value = false;
  }
}

function selectAnimal(animal: ChineseAnimal): void {
  if (animal === selectedAnimal.value) return;
  selectedAnimal.value = animal;
  void loadReading();
}

function selectPeriod(next: Period): void {
  if (next === period.value) return;
  period.value = next;
  void loadReading();
}

onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      const profile = await chineseHoroscopeService.fetchChineseProfile();
      selectedAnimal.value = profile.animal;
    } catch {
      // No saved birth profile — keep the default and let the picker drive.
    }
  }
  await loadReading();
});

watch(locale, () => {
  void loadReading();
});
</script>

<template>
  <AppContainer size="md">
    <section class="cz-page">
      <header class="cz-header">
        <h1 class="cz-title">{{ t('chineseZodiac.dailyTitle') }}</h1>
        <p class="cz-subtitle">{{ t('chineseZodiac.dailySubtitle') }}</p>
      </header>

      <div class="cz-animals" role="tablist">
        <button
          v-for="animal in animals"
          :key="animal"
          class="cz-animal-chip"
          :class="{ active: animal === selectedAnimal }"
          @click="selectAnimal(animal)"
        >
          <span class="cz-animal-emoji">{{ animalEmoji(animal) }}</span>
          <span class="cz-animal-name">{{ animalName(animal) }}</span>
        </button>
      </div>

      <div class="cz-periods">
        <button
          v-for="p in periods"
          :key="p"
          class="cz-period"
          :class="{ active: p === period }"
          @click="selectPeriod(p)"
        >
          {{ t(`chineseZodiac.period${p.charAt(0).toUpperCase() + p.slice(1)}`) }}
        </button>
      </div>

      <LoadingSpinner v-if="loading" :label="t('chineseZodiac.loading')" />
      <div v-else-if="reading" class="cz-reading glass-card">
        <h3 class="cz-reading-animal">{{ animalEmoji(selectedAnimal) }} {{ animalName(selectedAnimal) }}</h3>
        <div class="cz-block">
          <h4>{{ t('chineseZodiac.overall') }}</h4>
          <p>{{ reading.overall }}</p>
        </div>
        <div class="cz-block">
          <h4>{{ t('chineseZodiac.love') }}</h4>
          <p>{{ reading.love }}</p>
        </div>
        <div class="cz-block">
          <h4>{{ t('chineseZodiac.career') }}</h4>
          <p>{{ reading.career }}</p>
        </div>
        <div class="cz-block">
          <h4>{{ t('chineseZodiac.health') }}</h4>
          <p>{{ reading.health }}</p>
        </div>
        <div class="cz-lucky">
          <span>{{ t('chineseZodiac.luckyNumber') }}: <strong>{{ reading.luckyNumber }}</strong></span>
          <span>{{ t('chineseZodiac.luckyColor') }}: <strong>{{ reading.luckyColor }}</strong></span>
        </div>
      </div>
      <p v-else-if="error" class="cz-error">{{ error }}</p>

      <button class="cz-compat-link" @click="router.push('/chinese/compatibility')">
        ☯ {{ t('chineseZodiac.openCompatibility') }}
      </button>
    </section>
  </AppContainer>
</template>

<style scoped>
.cz-page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-top: 1.4rem;
}
.cz-header {
  text-align: center;
}
.cz-title {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  color: var(--text-primary);
  margin: 0 0 0.4rem;
}
.cz-subtitle {
  color: var(--text-secondary);
  margin: 0 auto;
  max-width: 38rem;
  line-height: 1.6;
  font-size: 0.95rem;
}
.cz-animals {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.2rem, 1fr));
  gap: 0.5rem;
}
.cz-animal-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.6rem 0.3rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.cz-animal-chip:hover {
  background: rgba(212, 175, 55, 0.07);
}
.cz-animal-chip.active {
  border-color: var(--gold);
  background: rgba(212, 175, 55, 0.12);
  color: var(--gold-light);
}
.cz-animal-emoji {
  font-size: 1.5rem;
}
.cz-animal-name {
  font-size: 0.74rem;
}
.cz-periods {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  flex-wrap: wrap;
}
.cz-period {
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.84rem;
}
.cz-period.active {
  color: #151326;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
}
.cz-reading {
  padding: 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cz-reading-animal {
  margin: 0;
  font-family: var(--font-display);
  color: var(--text-primary);
}
.cz-block h4 {
  margin: 0 0 0.3rem;
  color: var(--gold-light);
  font-size: 0.95rem;
}
.cz-block p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-line;
}
.cz-lucky {
  display: flex;
  gap: 1.2rem;
  flex-wrap: wrap;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.cz-lucky strong {
  color: var(--gold-light);
}
.cz-error {
  text-align: center;
  color: var(--error);
}
.cz-compat-link {
  align-self: center;
  margin-top: 0.4rem;
  padding: 0.6rem 1.4rem;
  border-radius: 999px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  background: rgba(212, 175, 55, 0.08);
  color: var(--gold-light);
  cursor: pointer;
  font-size: 0.9rem;
}
</style>
```

- [ ] **Step 4: Create the Chinese birth chart page**

Create `frontend/src/pages/ChineseChartPage.vue` (profile/birth-date + per-animal chart traits):

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { chineseHoroscopeService, CHINESE_ANIMAL_ORDER, getChineseAnimalInfo, chineseElementColor } from '../lib';
import type { ChineseAnimal, ChineseProfile } from '../lib/types';
import { useAuth } from '../composables/useAuth';
import AppContainer from '../components/layout/AppContainer.vue';

const { t } = useI18n();
const { isAuthenticated } = useAuth();
const router = useRouter();

const selectedAnimal = ref<ChineseAnimal>('dragon');
const profile = ref<ChineseProfile | null>(null);
const birthDate = ref('');
const error = ref<string | null>(null);

const animals = CHINESE_ANIMAL_ORDER;

function animalName(animal: ChineseAnimal): string {
  return t(`chineseZodiac.animals.${animal}`);
}
function animalEmoji(animal: ChineseAnimal): string {
  return getChineseAnimalInfo(animal).emoji;
}

const info = computed(() => getChineseAnimalInfo(selectedAnimal.value));
const accent = computed(() =>
  chineseElementColor(
    profile.value && profile.value.animal === selectedAnimal.value
      ? profile.value.element
      : info.value.fixedElement,
  ),
);
const showsYearDetails = computed(
  () => profile.value !== null && profile.value.animal === selectedAnimal.value,
);

function selectAnimal(animal: ChineseAnimal): void {
  selectedAnimal.value = animal;
}

async function revealFromBirthDate(): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.value)) return;
  try {
    profile.value = await chineseHoroscopeService.fetchChineseProfilePreview(birthDate.value);
    selectedAnimal.value = profile.value.animal;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      profile.value = await chineseHoroscopeService.fetchChineseProfile();
      selectedAnimal.value = profile.value.animal;
    } catch {
      profile.value = null;
    }
  }
});
</script>

<template>
  <AppContainer size="md">
    <section class="cc-page">
      <header class="cc-header">
        <h1 class="cc-title">{{ t('chineseZodiac.chartTitle') }}</h1>
        <p class="cc-subtitle">{{ t('chineseZodiac.chartSubtitle') }}</p>
      </header>

      <div v-if="!profile" class="glass-card cc-birthdate">
        <p class="cc-hint">{{ t('chineseZodiac.guestProfileHint') }}</p>
        <div class="cc-birthdate-row">
          <label class="cc-field">
            <span>{{ t('chineseZodiac.birthDate') }}</span>
            <input v-model="birthDate" type="date" />
          </label>
          <button class="btn-celestial" @click="revealFromBirthDate">{{ t('chineseZodiac.reveal') }}</button>
        </div>
        <p v-if="error" class="cc-error">{{ error }}</p>
      </div>

      <div class="cc-animals" role="tablist">
        <button
          v-for="animal in animals"
          :key="animal"
          class="cc-animal-chip"
          :class="{ active: animal === selectedAnimal }"
          @click="selectAnimal(animal)"
        >
          <span class="cc-animal-emoji">{{ animalEmoji(animal) }}</span>
          <span class="cc-animal-name">{{ animalName(animal) }}</span>
        </button>
      </div>

      <div class="glass-card cc-chart" :style="{ '--cc-accent': accent }">
        <div class="cc-chart-head">
          <div class="cc-chart-emoji">{{ animalEmoji(selectedAnimal) }}</div>
          <div>
            <p class="cc-chart-label">{{ t('chineseZodiac.yourSign') }}</p>
            <h2 class="cc-chart-name">{{ animalName(selectedAnimal) }}</h2>
            <p v-if="showsYearDetails && profile" class="cc-chart-born">
              {{ t('chineseZodiac.born', { animal: animalName(selectedAnimal) }) }} · {{ profile.zodiacYear }}
            </p>
          </div>
        </div>

        <div class="cc-attrs">
          <span v-if="showsYearDetails && profile" class="cc-attr">
            {{ t('chineseZodiac.element') }}: {{ t(`chineseZodiac.elements.${profile.element}`) }}
          </span>
          <span class="cc-attr">
            {{ t('chineseZodiac.fixedElement') }}: {{ t(`chineseZodiac.elements.${info.fixedElement}`) }}
          </span>
          <span class="cc-attr">
            {{ t('chineseZodiac.polarity') }}:
            {{ info.yinYang === 'yang' ? t('chineseZodiac.yang') : t('chineseZodiac.yin') }}
          </span>
          <span class="cc-attr">{{ t('chineseZodiac.trineGroup') }}: {{ info.trineGroup }}</span>
          <span class="cc-attr">
            {{ t('chineseZodiac.secretFriend') }}: {{ animalEmoji(info.secretFriend) }} {{ animalName(info.secretFriend) }}
          </span>
          <span class="cc-attr">
            {{ t('chineseZodiac.conflictAnimal') }}: {{ animalEmoji(info.conflictAnimal) }} {{ animalName(info.conflictAnimal) }}
          </span>
          <span class="cc-attr">{{ t('chineseZodiac.luckyNumbers') }}: {{ info.luckyNumbers.join(', ') }}</span>
        </div>
      </div>

      <button class="cc-compat-link" @click="router.push('/chinese/compatibility')">
        ☯ {{ t('chineseZodiac.openCompatibility') }}
      </button>
    </section>
  </AppContainer>
</template>

<style scoped>
.cc-page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-top: 1.4rem;
}
.cc-header {
  text-align: center;
}
.cc-title {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  color: var(--text-primary);
  margin: 0 0 0.4rem;
}
.cc-subtitle {
  color: var(--text-secondary);
  margin: 0 auto;
  max-width: 38rem;
  line-height: 1.6;
  font-size: 0.95rem;
}
.cc-birthdate {
  padding: 1.1rem;
}
.cc-hint {
  margin: 0 0 0.7rem;
  color: var(--text-secondary);
  font-size: 0.88rem;
}
.cc-birthdate-row {
  display: flex;
  gap: 0.7rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
.cc-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.cc-field input {
  padding: 0.55rem 0.7rem;
  border-radius: 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  color-scheme: dark;
}
.cc-animals {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.2rem, 1fr));
  gap: 0.5rem;
}
.cc-animal-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.6rem 0.3rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.cc-animal-chip:hover {
  background: rgba(212, 175, 55, 0.07);
}
.cc-animal-chip.active {
  border-color: var(--gold);
  background: rgba(212, 175, 55, 0.12);
  color: var(--gold-light);
}
.cc-animal-emoji {
  font-size: 1.5rem;
}
.cc-animal-name {
  font-size: 0.74rem;
}
.cc-chart {
  padding: 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-left: 3px solid var(--cc-accent, var(--gold));
}
.cc-chart-head {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.cc-chart-emoji {
  font-size: 3rem;
  line-height: 1;
}
.cc-chart-label {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-muted);
}
.cc-chart-name {
  margin: 0.1rem 0;
  font-family: var(--font-display);
  font-size: 1.5rem;
  color: var(--cc-accent, var(--gold));
}
.cc-chart-born {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.cc-attrs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.cc-attr {
  font-size: 0.78rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}
.cc-error {
  margin: 0.6rem 0 0;
  color: var(--error);
}
.cc-compat-link {
  align-self: center;
  margin-top: 0.4rem;
  padding: 0.6rem 1.4rem;
  border-radius: 999px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  background: rgba(212, 175, 55, 0.08);
  color: var(--gold-light);
  cursor: pointer;
  font-size: 0.9rem;
}
</style>
```

- [ ] **Step 5: Verify typecheck**

Run: `npm run type-check`
Expected: PASS. Both new pages compile; the old page is still present and routed.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ChineseDailyPage.vue frontend/src/pages/ChineseChartPage.vue frontend/src/i18n/locales/en.json frontend/src/i18n/locales/mn.json
git commit -m "feat(web): split Chinese zodiac into daily + birth chart pages"
```

---

### Task 5: Wire routes and retire the combined page

Point the router at the new pages, add the `/chinese` redirect, and delete `ChineseZodiacPage.vue`.

**Files:**
- Modify: `frontend/src/router/index.ts`
- Delete: `frontend/src/pages/ChineseZodiacPage.vue`

**Interfaces:**
- Consumes: `ChineseDailyPage`, `ChineseChartPage` (Task 4); existing `ChineseCompatibilityPage`.
- Produces: routes `chinese-today` (`/chinese/today`), `chinese-chart` (`/chinese/chart`), redirect `/chinese` → `/chinese/today`.

- [ ] **Step 1: Update the `pages` map**

In `frontend/src/router/index.ts`, remove the `ChineseZodiacPage` entry and add the two new pages. Replace:

```ts
  ChineseZodiacPage: () => import('../pages/ChineseZodiacPage.vue'),
  ChineseCompatibilityPage: () => import('../pages/ChineseCompatibilityPage.vue'),
```

with:

```ts
  ChineseDailyPage: () => import('../pages/ChineseDailyPage.vue'),
  ChineseChartPage: () => import('../pages/ChineseChartPage.vue'),
  ChineseCompatibilityPage: () => import('../pages/ChineseCompatibilityPage.vue'),
```

- [ ] **Step 2: Update the route table**

In the same file, replace the single Chinese zodiac route:

```ts
    { path: '/chinese', name: 'chinese-zodiac', component: pages.ChineseZodiacPage, meta: { guestAllowed: true } },
    { path: '/chinese/compatibility', name: 'chinese-compatibility', component: pages.ChineseCompatibilityPage, meta: { guestAllowed: true } },
```

with:

```ts
    { path: '/chinese', redirect: '/chinese/today' },
    { path: '/chinese/today', name: 'chinese-today', component: pages.ChineseDailyPage, meta: { guestAllowed: true } },
    { path: '/chinese/chart', name: 'chinese-chart', component: pages.ChineseChartPage, meta: { guestAllowed: true } },
    { path: '/chinese/compatibility', name: 'chinese-compatibility', component: pages.ChineseCompatibilityPage, meta: { guestAllowed: true } },
```

- [ ] **Step 3: Delete the retired page**

```bash
git rm frontend/src/pages/ChineseZodiacPage.vue
```

- [ ] **Step 4: Verify nothing else imports the deleted page**

Run (from repo root): `git grep -n "ChineseZodiacPage" -- frontend/src`
Expected: no output (no remaining references).

- [ ] **Step 5: Verify typecheck**

Run (from `frontend/`): `npm run type-check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/router/index.ts
git commit -m "feat(web): route Chinese daily/chart pages and redirect /chinese"
```

---

### Task 6: Mode-aware navbar + render the toggle

Make `App.vue` build its feature links from the current mode, render the toggle (desktop + mobile), drop the standalone Chinese tab, and replace the hardcoded `'Chart'` label.

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/i18n/locales/en.json`
- Modify: `frontend/src/i18n/locales/mn.json`

**Interfaces:**
- Consumes: `useZodiacModeStore` (Task 2); `ZodiacModeToggle` (Task 3); routes from Task 5.

- [ ] **Step 1: Add the `nav.birthChart` i18n key (both locales)**

In `frontend/src/i18n/locales/en.json`, inside the `"nav"` object add:

```json
    "birthChart": "Birth Chart",
```

In `frontend/src/i18n/locales/mn.json`, inside its `"nav"` object add:

```json
    "birthChart": "Төрсөн зурхай",
```

(Leave the existing `"chineseZodiac"` nav key in place — it is intentionally retained.)

- [ ] **Step 2: Verify locale parity**

Run: `npm run verify:locales`
Expected: PASS.

- [ ] **Step 3: Import the store and toggle in `App.vue`**

In the `<script setup>` block of `frontend/src/App.vue`, add imports near the other imports:

```ts
import { useZodiacModeStore } from './stores';
```

and register the toggle alongside the other async components:

```ts
const ZodiacModeToggle = defineAsyncComponent(() => import('./components/ZodiacModeToggle.vue'));
```

Then, after the `const { t } = useI18n();` line, add:

```ts
const zodiacMode = useZodiacModeStore();
```

- [ ] **Step 4: Replace the `navLinks` computed**

Replace the entire existing `navLinks` computed (the block from `const navLinks = computed(() => [` through `].map((link) => (link.to === '/' ? { ...link, to: '/today' } : link)));`) with:

```ts
// Icons are deliberately monochrome celestial glyphs (not emoji) so every nav
// item adopts the gold theme color and reads as one consistent set.
const navLinks = computed(() => {
  const featureLinks =
    zodiacMode.mode === 'chinese'
      ? [
          { to: '/chinese/today', label: t('nav.home'), icon: '✨' },
          { to: '/chinese/compatibility', label: t('nav.compatibility'), icon: '♡' },
          { to: '/chinese/chart', label: t('nav.birthChart'), icon: '◎' },
        ]
      : [
          { to: '/today', label: t('nav.home'), icon: '✨' },
          { to: '/compatibility', label: t('nav.compatibility'), icon: '♡' },
          { to: '/tarot', label: t('nav.tarot'), icon: '✶' },
          { to: '/chart', label: t('nav.birthChart'), icon: '◎' },
        ];
  return [
    ...featureLinks,
    { to: '/premium', label: t('nav.premium'), icon: '✦' },
    { to: '/profile', label: t('nav.profile'), icon: '☽' },
  ];
});
```

(`visibleNavLinks` still filters out `/profile` for guests and is unchanged.)

- [ ] **Step 5: Render the toggle (desktop + mobile)**

In the template, in the desktop actions block, add the toggle before `<LanguageSwitcher />`:

```html
        <div class="nav-desktop-actions">
          <ZodiacModeToggle />
          <LanguageSwitcher />
```

And in the mobile menu actions block, add it before `<LanguageSwitcher />` there too:

```html
        <div class="mobile-menu-actions">
          <ZodiacModeToggle />
          <LanguageSwitcher />
```

- [ ] **Step 6: Verify typecheck**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 7: Manual verification (dev server)**

Run: `npm run dev`, open the app, and confirm:
- Western mode navbar shows: Today, Compatibility, Tarot, Birth Chart, Premium, (Profile if signed in). No "Lunar Zodiac" tab.
- Clicking **Chinese** in the toggle: navbar becomes Today, Compatibility, Birth Chart, Premium, (Profile) — **no Tarot** — and the page navigates to `/chinese/today`.
- From `/chart` (Western), toggling to Chinese lands on `/chinese/chart`; toggling back lands on `/chart`.
- From `/premium`, toggling mode stays on `/premium` (navbar links still update).
- Reload the page in Chinese mode → it stays Chinese (persistence).
- Switch language (en/mn) → toggle labels and nav labels translate.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/App.vue frontend/src/i18n/locales/en.json frontend/src/i18n/locales/mn.json
git commit -m "feat(web): make navbar zodiac-mode aware with mode toggle"
```

---

### Task 7: Full verification

Run the same gates CI runs for the frontend, plus the SSG-affecting build (the router changed).

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run (from `frontend/`): `npm run type-check`
Expected: PASS, no errors.

- [ ] **Step 2: Unit tests**

Run (from `frontend/`): `npm test`
Expected: PASS, including `zodiacModeRoutes.test.ts` and `zodiacMode.test.ts`.

- [ ] **Step 3: Locale parity**

Run (from `frontend/`): `npm run verify:locales`
Expected: PASS.

- [ ] **Step 4: Production build (includes zodiac SSG prerender)**

Run (from `frontend/`): `npm run build`
Expected: build completes; prerender step succeeds (the new routes don't break SSG since zodiac SSG covers `/horoscope/:sign`, which is unchanged).

- [ ] **Step 5: Final commit (if anything regenerated)**

```bash
git add -A
git commit -m "chore(web): verify zodiac mode switch build" --allow-empty
```

---

## Self-review notes

- **Spec coverage:** mode store (Task 2) ✓; persisted localStorage via `getStorage` (Task 2) ✓; navbar toggle desktop+mobile (Tasks 3, 6) ✓; mode-aware links incl. no-Tarot-in-Chinese (Task 6) ✓; dedicated `/chinese/today`, `/chinese/chart`, `/chinese/compatibility` + `/chinese` redirect (Task 5) ✓; route counterpart mapping with stay-on-Premium/Profile O1 (Task 1) ✓; daily/chart page split with animal/element birth chart (Task 4) ✓; `nav.birthChart` replaces hardcoded `'Chart'` and standalone Chinese tab removed (Task 6) ✓; keep `nav.chineseZodiac` key O2 (Task 6 note) ✓; i18n en+mn parity + `verify:locales` per task ✓; no backend/mobile changes ✓.
- **Placeholder scan:** none — every code/step is concrete.
- **Type consistency:** `ZodiacMode` defined in Task 1, imported by Tasks 2/3; `resolveModeNavigation`/`ZODIAC_TODAY` signatures consistent across Tasks 1/3; store API (`mode`/`hydrate`/`setMode`/`toggle`) consistent across Tasks 2/3/6; route paths consistent across Tasks 1/4/5/6.
```
