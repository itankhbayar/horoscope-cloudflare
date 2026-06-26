# Eastern Birth Chart Redesign — Design

**Date:** 2026-06-26
**Scope:** Mobile (`astralis-mobile`) — `mobile/src/screens/chart/EasternChart.tsx`
**Status:** Approved (brainstorming)

## Goal

Rebuild the Eastern (Chinese zodiac) birth chart screen so it wears the same
**Ink & Jade** (light) / **Lunar Night** (dark) visual identity already shipped
for `EasternHome` and `EasternCompatibility`. The chart screen currently predates
that theme system: it reads the generic `useAppearance().palette` and renders a
flat attribute card, so it looks visually orphaned from the rest of the Eastern
experience.

This is a **themed re-skin only**. Content, data flow, navigation, and i18n are
unchanged.

## Context

- `mobile/src/screens/home/easternTheme.ts` defines the shared `EasternPalette`,
  `EASTERN_LIGHT` / `EASTERN_DARK` palettes, `easternForMode`, and the
  `useEasternTheme()` hook. This is the source of truth for the family's look.
- `EasternHome.tsx` and `EasternCompatibility.tsx` are the reference
  implementations of the pattern. Both use a `makeStyles(theme)` factory, a
  `bgDecor` block (glow orbs + dark-mode moon), `ScreenScroll
  scrollBackgroundColor={theme.bgBase}`, and a 4-step staggered fade-in.
- `ChartScreen.tsx` routes `mode === 'eastern' ? <EasternChart /> : <WesternChart />`
  via `useZodiacMode()`. **This routing is unchanged.**

## Current vs. target

The screen keeps its existing structure and data:

- Title + subtitle → folded into a themed **hero card**.
- "Pick animal" label + **horizontal-scroll** animal picker (unchanged layout).
- Chart card: animal emoji + name + optional born/year meta, then the attribute
  pills (fixed element, polarity, trine group, secret friend, conflict animal,
  lucky numbers, plus the user's birth element when it's their own sign).

Data sources stay the same: `useChineseZodiac()` for the signed-in user's
profile (anchors the default animal and shows born/year meta), and
`getChineseAnimalInfo(animal)` + `CHINESE_ANIMAL_ORDER` from
`@astralis/lib/chineseZodiac` for the per-animal attributes.

## Changes

All changes are confined to `EasternChart.tsx`.

1. **Theme source.** Replace `useAppearance()` with `useEasternTheme()` (imported
   from `../home/easternTheme`). Convert the static `StyleSheet.create` into a
   `makeStyles(theme: EasternPalette)` factory, memoized via
   `useMemo(() => makeStyles(theme), [theme])` — identical to the sibling screens.

2. **Backdrop.** Use `ScreenScroll scrollBackgroundColor={theme.bgBase}` and add
   the shared `bgDecor` block: two absolutely-positioned glow orbs (`theme.glowA`,
   `theme.glowB`) and the dark-mode `moon` (rendered only when `theme.moon` is
   non-null). Copy the `bgDecor` / `glow` / `glowA` / `glowB` / `moon` style
   definitions verbatim from `EasternHome` so the three screens stay pixel-aligned.

3. **Hero card.** Promote the title/subtitle + chart head into one themed hero
   card matching `EasternHome.heroCard`:
   - Accent eyebrow: `✧  ` + `t('chinese.chartTitle')`.
   - Subtitle line: `t('chinese.chartSubtitle')` in `theme.textMuted`.
   - Selected animal emoji + name (name in `theme.animalName`).
   - Born/year meta line (`t('chinese.born', …) · zodiacYear`) shown only when the
     selected animal equals the user's own birth-year animal (`showsYearDetails`).

4. **Animal picker.** Keep the horizontal `ScrollView`. Re-skin the chips using
   `EasternHome`'s picker styles (`animalChip` / `animalChipActive`,
   `animalChipName` / `animalChipNameActive`): inactive uses `theme.cardBorder` +
   `theme.card`; active uses `theme.accent` + `theme.chipBg`. This removes the
   hardcoded `rgba(212,175,55,0.14)` and the generic `palette.*` references.

5. **Attribute chips.** Re-skin the attribute pills with `theme.card` background,
   `theme.cardBorder` border, `theme.textMuted` labels, and `theme.text` values.

6. **Motion.** Add the same 4-step staggered fade-in entrance used by the sibling
   screens (`Animated.stagger(80, …)` over four `Animated.Value(0)`s, 420ms
   timing, `useNativeDriver: true`), wrapping: hero, picker, and attribute card.

## Deliberate decisions

- **Single theme accent (no per-element tint).** The current card draws a left
  border tinted by `chineseElementColor` (fire=red, water=blue, etc.). It is
  dropped in favor of the family's single `theme.accent` (jade in light, gold in
  dark). No information is lost — the element remains a labeled attribute chip.
  This is the one behavioral change from the old screen and keeps the chart
  consistent with Home and Compatibility.
- **Horizontal-scroll picker retained** (not switched to the
  `EasternCompatibility` wrapped grid). This screen has a single picker, so the
  compact horizontal row mirrors `EasternHome` and keeps the chart card high on
  the screen.

## Out of scope

- No new graphics (no trine wheel / element ring).
- No changes to data, hooks, i18n keys, or `@astralis/lib/chineseZodiac`.
- No changes to `ChartScreen.tsx` routing or the Western chart.
- `chineseElementColor` may become unused in this file; leave the export itself
  untouched (other callers may use it) and simply stop importing it here.

## Testing

- The screen is presentational; the existing `easternTheme.test.ts` already covers
  the palette/`scoreColor` logic the screen relies on. No new theme tokens are
  introduced, so no new token tests are required.
- Run `npm run typecheck` (root) and the mobile Vitest suite (`cd mobile &&
  npm test`) to confirm no regressions.
- Manual check: toggle appearance light/dark with Eastern zodiac mode active and
  confirm the chart matches Home/Compatibility (backdrop, hero, picker, chips,
  fade-in), in both `en` and `mn`.
