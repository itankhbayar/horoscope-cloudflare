# Design: Western / Chinese Zodiac Mode Switch (Web)

**Date:** 2026-06-23
**Scope:** `frontend/` (Vue web app) only. No backend, D1, or API changes.
**Status:** Approved (Approach A)

## Problem

Today the Chinese zodiac is a single nav tab (`/chinese`) sitting alongside the Western
features. We want a **global mode switch** so the entire navbar flips between two systems:

- **Western Astrology** (existing): Today, Compatibility, Tarot, Birth Chart
- **Chinese Zodiac**: Today, Compatibility, Birth Chart — **no Tarot**

When in Chinese mode, the feature pages show Chinese-zodiac readings instead of Western ones.
Premium and Profile are always available in both modes.

## Decisions (from brainstorming)

- **Platform:** Web only for now. Mobile is out of scope.
- **Chinese mode nav items:** Today (daily reading), Compatibility, Birth Chart. **No Tarot.**
- **Chinese Birth Chart depth:** Animal/element profile (reuses existing birth-date-derived
  `ChineseProfile` data). **Not** Four Pillars / BaZi.
- **Switch UX:** A Western/Chinese toggle in the navbar; the choice is **persisted to
  localStorage** so it survives reloads and revisits.
- **Old tab:** The standalone "Lunar/Chinese Zodiac" tab is **removed**; its content is now
  reached through Chinese mode. `/chinese` redirects into the new mode.

## Existing building blocks (reused as-is)

Backend already provides everything needed — no changes required:

- `GET /api/chinese/daily/:animal`, `/weekly|/monthly|/yearly/:animal` — readings
- `POST /api/chinese/compatibility/signs` — compatibility (auth + premium)
- `GET /api/chinese/profile` (auth) and `/api/chinese/profile/preview?birthDate=` (guest) — the
  birth-chart data (animal, element, yinYang, fixedElement, zodiacYear, luckyNumbers)
- Cron already prewarms Chinese daily/period readings.

Frontend libs reused: `chineseHoroscopeService`, `chineseCompatibilityService`,
`chineseZodiac` helpers (`CHINESE_ANIMAL_ORDER`, `getChineseAnimalInfo`, `chineseElementColor`),
`LoadingSpinner`, `GuestResultGate`, `AppContainer`.

## Architecture (Approach A: mode-aware navbar + dedicated Chinese routes)

### 1. Mode store — `frontend/src/stores/zodiacMode.ts`

A small Pinia store mirroring the `appSettings` pattern.

- State: `mode: Ref<'western' | 'chinese'>`, default `'western'`.
- `hydrate()` — read from `getStorage().getItem('astralis_zodiac_mode_v1')`; validate value.
- `setMode(next)` / `toggle()` — update ref and persist via `getStorage().setItem(...)`.
- Hydrated at app bootstrap (same place `appSettings.hydrate` is called).

Persistence uses the existing `getStorage()` abstraction (not raw `localStorage`) for
consistency and SSG/prerender safety.

### 2. Navbar (`App.vue`)

- The feature links become **mode-driven** via a computed that branches on `zodiacMode.mode`:

  | Slot          | Western        | Chinese                  |
  |---------------|----------------|--------------------------|
  | Today         | `/today`       | `/chinese/today`         |
  | Compatibility | `/compatibility` | `/chinese/compatibility` |
  | Tarot         | `/tarot`       | *(omitted)*              |
  | Birth Chart   | `/chart`       | `/chinese/chart`         |

- **Always shown (both modes):** Premium (`/premium`), Profile (`/profile`, auth only).
- The standalone Chinese Zodiac link is removed from `navLinks`.
- A new `ZodiacModeToggle.vue` segmented control (Western ☀ / Chinese ☯) is rendered in the
  navbar and inside the mobile menu. Selecting a mode calls `setMode` then navigates to the
  current page's counterpart in the target mode (see route mapping).
- Active-link logic continues to match on `route.path`.

### 3. Routing (`frontend/src/router/index.ts`)

- Add routes (all `guestAllowed`, lazy-loaded like the rest):
  - `/chinese/today` → `ChineseDailyPage`
  - `/chinese/chart` → `ChineseChartPage`
  - `/chinese/compatibility` → `ChineseCompatibilityPage` (existing, unchanged)
- `/chinese` redirects to `/chinese/today`.
- Remove the old `/chinese` → `ChineseZodiacPage` mapping once the page is split.

### 4. Mode ↔ route mapping (for the toggle)

A pure helper (e.g. `frontend/src/lib/zodiacModeRoutes.ts`) maps a path to its counterpart:

```
/today               <-> /chinese/today
/compatibility       <-> /chinese/compatibility
/chart               <-> /chinese/chart
```

- When toggling, look up the counterpart for `route.path`. If none exists (e.g. `/tarot`,
  `/premium`, `/profile`, deep links), navigate to the target mode's **Today** page.
- Premium/Profile are mode-agnostic; toggling on those pages updates the navbar but does not
  force navigation away (counterpart resolves to "stay or go to Today" — see Open question O1).

The helper is unit-tested (pure function, fits the existing `*.test.ts` Vitest setup).

### 5. Pages

Split the current combined `ChineseZodiacPage.vue` (profile card + birth-date entry + animal
picker + period readings) into two focused pages:

- **`ChineseDailyPage.vue`** (`/chinese/today`): animal picker + period tabs
  (daily/weekly/monthly/yearly) + the reading card. On mount, if authenticated, preselect the
  user's animal from `fetchChineseProfile()`; otherwise default and let the picker drive.
- **`ChineseChartPage.vue`** (`/chinese/chart`): the Chinese **birth chart** — animal + emoji,
  governing element, yin/yang, fixed element, zodiac year, lucky numbers, plus trine group /
  secret friend / conflict animal (from `getChineseAnimalInfo`). Includes the guest birth-date
  entry (`fetchChineseProfilePreview`) so guests can compute their chart.

`ChineseZodiacPage.vue` is deleted after the split. Shared styling/markup is preserved by
moving the relevant blocks into the two new pages.

### 6. i18n

- Add keys to `en.json` and `mn.json`:
  - `nav.birthChart` (replaces the hardcoded `'Chart'` label in `App.vue`)
  - `zodiacMode.western`, `zodiacMode.chinese`, and an accessible label
    (`zodiacMode.toggleLabel`).
- The `nav.chineseZodiac` key is no longer used by the navbar; leave or remove (see O2).
- Reuse existing `chineseZodiac.*` keys for the daily/chart page content.
- `npm run verify:locales` must pass (en/mn parity).

## Data flow

```
ZodiacModeToggle -> zodiacMode store (persist) -> navbar computed links recompute
                 -> router.push(counterpart route)
ChineseDailyPage -> chineseHoroscopeService.fetchChineseDaily/Period -> /api/chinese/*
ChineseChartPage -> chineseHoroscopeService.fetchChineseProfile / ...Preview -> /api/chinese/profile*
ChineseCompatibilityPage (unchanged) -> chineseCompatibilityService -> /api/chinese/compatibility/signs
```

## Error handling

- Page-level: existing per-page `error`/`loading` refs and `LoadingSpinner` are retained.
- Birth chart for a guest with no birth date: show the birth-date entry (current behavior).
- Compatibility remains premium-gated via `GuestResultGate` (unchanged).
- Mode hydration failure: fall back to `'western'` and clear the bad storage value.

## Testing

- Unit test the route-mapping helper (`zodiacModeRoutes`): each Western path maps to its Chinese
  counterpart and back; unmapped paths fall back to the mode's Today.
- Unit test the `zodiacMode` store: default, hydrate (valid/invalid/missing), setMode persists,
  toggle flips.
- Manual/UX check: toggle from each feature page lands on the correct counterpart; Tarot hidden
  in Chinese mode; navbar active states correct; mode persists across reload.
- `npm run type-check`, `npm test` (frontend), and `npm run verify:locales` all pass.

## Out of scope

- Mobile app (Expo) — unchanged.
- Four Pillars / BaZi chart.
- Any backend, schema, or cron changes.
- A Chinese Tarot.

## Open questions

- **O1:** When toggling to Chinese mode while on Premium/Profile, should we (a) stay on the same
  page (mode just updates the navbar) or (b) navigate to the mode's Today? Proposed default: **(a)
  stay** — Premium/Profile are mode-agnostic. Revisit if it feels odd.
- **O2:** Remove the now-unused `nav.chineseZodiac` i18n key, or keep it for any deep links?
  Proposed: keep the key, remove the nav usage (low risk).
