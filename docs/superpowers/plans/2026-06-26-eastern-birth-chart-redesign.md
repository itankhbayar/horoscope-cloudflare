# Eastern Birth Chart Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the mobile Eastern (Chinese zodiac) birth chart screen to wear the shared Ink & Jade / Lunar Night identity already used by Eastern Home and Eastern Compatibility.

**Architecture:** Single-file change to `mobile/src/screens/chart/EasternChart.tsx`. Swap the generic `useAppearance().palette` for `useEasternTheme()`, convert the static stylesheet into a `makeStyles(theme)` factory, and adopt the family's structural shell (themed backdrop with glow orbs + dark-mode moon, themed hero card, themed animal picker, themed attribute chips, staggered fade-in). No data, hook, i18n, or routing changes.

**Tech Stack:** React Native (Expo), TypeScript, React Native `Animated`, existing `easternTheme.ts` palette system.

## Global Constraints

- Theme source for this screen MUST be `useEasternTheme()` from `mobile/src/screens/home/easternTheme.ts` — not `useAppearance()`.
- Reuse the exact structural style values from `EasternHome.tsx` for `bgDecor`/`glow`/`glowA`/`glowB`/`moon` and the animal picker so the three Eastern screens stay pixel-aligned.
- Use the single `theme.accent` everywhere; do NOT tint by `chineseElementColor` (the per-element accent is being removed).
- Keep the horizontal-scroll animal picker (do not switch to a wrapped grid).
- Do not change content, data flow, i18n keys, `@astralis/lib/chineseZodiac`, `ChartScreen.tsx` routing, or the Western chart.
- The `chineseElementColor` export in `@astralis/lib/chineseZodiac` stays; only stop importing it in this file.

---

### Task 1: Re-skin `EasternChart.tsx` with the Eastern theme identity

**Files:**
- Modify (full rewrite): `mobile/src/screens/chart/EasternChart.tsx`
- Reference only (do not edit): `mobile/src/screens/home/EasternHome.tsx`, `mobile/src/screens/home/easternTheme.ts`

**Interfaces:**
- Consumes:
  - `useEasternTheme(): EasternPalette` and `type EasternPalette` from `../home/easternTheme`.
  - `useChineseZodiac()` → `{ profile, loadProfile }` where `profile` is `null` or `{ animal: ChineseAnimal; element: string; zodiacYear: number; ... }` (same shape the current file already reads).
  - `getChineseAnimalInfo(a): { emoji, fixedElement, yinYang, trineGroup, secretFriend, conflictAnimal, luckyNumbers }` and `CHINESE_ANIMAL_ORDER: ChineseAnimal[]` from `@astralis/lib/chineseZodiac`.
  - `ScreenScroll` supports `scrollBackgroundColor` (already used by `EasternHome`).
  - i18n keys already in use by the current screen: `chinese.chartTitle`, `chinese.chartSubtitle`, `chinese.pickAnimal`, `chinese.yourSign`, `chinese.born`, `chinese.element`, `chinese.fixedElement`, `chinese.elements.*`, `chinese.polarity`, `chinese.yang`, `chinese.yin`, `chinese.trineGroup`, `chinese.secretFriend`, `chinese.conflictAnimal`, `chinese.luckyNumbers`, `chinese.animals.*`.
- Produces: `export function EasternChart(): ReactElement` — unchanged signature; consumed by `ChartScreen.tsx`.

- [ ] **Step 1: Replace the entire file contents**

Overwrite `mobile/src/screens/chart/EasternChart.tsx` with:

```tsx
import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHINESE_ANIMAL_ORDER, getChineseAnimalInfo } from '@astralis/lib/chineseZodiac';
import type { ChineseAnimal } from '@astralis/lib/types';
import { ScreenScroll } from '../../components/ScreenScroll';
import { spacing } from '../../theme';
import { useI18n } from '../../i18n';
import { useChineseZodiac } from '../../hooks/useChineseZodiac';
import { useEasternTheme, type EasternPalette } from '../home/easternTheme';

/**
 * Chart content when the Eastern zodiac mode is selected (see useZodiacMode).
 * Shares the Eastern Home identity (Ink & Jade / Lunar Night) via useEasternTheme.
 * Shows the lunar birth chart: the selected animal's fixed element, polarity,
 * trine group, and harmonizing/clashing signs. Anchored to the signed-in user's
 * birth-year animal when available. Mirrors the web ChineseChartPage.
 */
export function EasternChart(): ReactElement {
  const theme = useEasternTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { profile, loadProfile } = useChineseZodiac();
  const [animal, setAnimal] = useState<ChineseAnimal>('dragon');

  const animalName = useCallback((a: ChineseAnimal) => t(`chinese.animals.${a}`), [t]);
  const animalEmoji = useCallback((a: ChineseAnimal) => getChineseAnimalInfo(a).emoji, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile) setAnimal(profile.animal);
  }, [profile]);

  // Staggered fade-in, mirroring the Eastern Home / Compatibility entrance motion.
  const opacities = useMemo(() => Array.from({ length: 3 }, () => new Animated.Value(0)), []);
  useEffect(() => {
    const anims = opacities.map((o) =>
      Animated.timing(o, { toValue: 1, duration: 420, useNativeDriver: true }),
    );
    Animated.stagger(80, anims).start();
  }, [opacities]);

  const info = getChineseAnimalInfo(animal);
  const showsYearDetails = profile !== null && profile.animal === animal;

  const attrs: { label: string; value: string }[] = [
    ...(showsYearDetails && profile
      ? [{ label: t('chinese.element'), value: t(`chinese.elements.${profile.element}`) }]
      : []),
    { label: t('chinese.fixedElement'), value: t(`chinese.elements.${info.fixedElement}`) },
    { label: t('chinese.polarity'), value: info.yinYang === 'yang' ? t('chinese.yang') : t('chinese.yin') },
    { label: t('chinese.trineGroup'), value: String(info.trineGroup) },
    { label: t('chinese.secretFriend'), value: `${animalEmoji(info.secretFriend)} ${animalName(info.secretFriend)}` },
    { label: t('chinese.conflictAnimal'), value: `${animalEmoji(info.conflictAnimal)} ${animalName(info.conflictAnimal)}` },
    { label: t('chinese.luckyNumbers'), value: info.luckyNumbers.join(', ') },
  ];

  return (
    <ScreenScroll scrollBackgroundColor={theme.bgBase} contentContainerStyle={{ paddingTop: insets.top + spacing.md }}>
      <View style={styles.bgDecor} pointerEvents="none">
        <View style={[styles.glow, styles.glowA]} />
        <View style={[styles.glow, styles.glowB]} />
        {theme.moon ? <View style={styles.moon} /> : null}
      </View>

      {/* Hero */}
      <Animated.View style={{ opacity: opacities[0]! }}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{'✧  ' + t('chinese.chartTitle')}</Text>
          <Text style={styles.heroSub}>{t('chinese.chartSubtitle')}</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroEmoji}>{animalEmoji(animal)}</Text>
            <View style={styles.heroBody}>
              <Text style={styles.heroLabel}>{t('chinese.yourSign')}</Text>
              <Text style={styles.heroName}>{animalName(animal)}</Text>
              {showsYearDetails && profile ? (
                <Text style={styles.heroMeta}>
                  {t('chinese.born', { animal: animalName(animal) })} · {profile.zodiacYear}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Animal picker */}
      <Animated.View style={{ opacity: opacities[1]! }}>
        <Text style={styles.sectionLabel}>{t('chinese.pickAnimal')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.animalRow}>
          {CHINESE_ANIMAL_ORDER.map((a) => {
            const active = a === animal;
            return (
              <Pressable
                key={a}
                onPress={() => setAnimal(a)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.animalChip, active && styles.animalChipActive]}
              >
                <Text style={styles.animalEmoji}>{animalEmoji(a)}</Text>
                <Text style={[styles.animalChipName, active && styles.animalChipNameActive]}>{animalName(a)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Attributes */}
      <Animated.View style={{ opacity: opacities[2]! }}>
        <View style={styles.chartCard}>
          <View style={styles.attrs}>
            {attrs.map((a) => (
              <View key={a.label} style={styles.attrChip}>
                <Text style={styles.attrLabel}>{a.label}</Text>
                <Text style={styles.attrValue}>{a.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </ScreenScroll>
  );
}

function makeStyles(theme: EasternPalette) {
  return StyleSheet.create({
    bgDecor: { ...StyleSheet.absoluteFillObject, top: 0, height: 420 },
    glow: { position: 'absolute', borderRadius: 999 },
    glowA: { width: 300, height: 300, top: -90, right: -110, backgroundColor: theme.glowA },
    glowB: { width: 220, height: 220, top: 130, left: -120, backgroundColor: theme.glowB },
    moon: {
      position: 'absolute',
      top: 14,
      right: 22,
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: theme.moon ?? 'transparent',
      shadowColor: theme.moonGlow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    },

    heroCard: {
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 20,
      backgroundColor: theme.card,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    eyebrow: { color: theme.accent, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
    heroSub: { color: theme.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6 },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: spacing.md },
    heroEmoji: { fontSize: 48 },
    heroBody: { flex: 1 },
    heroLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
    heroName: { color: theme.animalName, fontSize: 24, fontWeight: '900', marginTop: 2 },
    heroMeta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },

    sectionLabel: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    animalRow: { gap: 8, paddingVertical: 2, paddingRight: spacing.md },
    animalChip: {
      width: 72,
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      borderWidth: 1,
      borderRadius: 14,
      borderColor: theme.cardBorder,
      backgroundColor: theme.card,
    },
    animalChipActive: { borderColor: theme.accent, backgroundColor: theme.chipBg },
    animalEmoji: { fontSize: 24 },
    animalChipName: { color: theme.textMuted, fontSize: 11 },
    animalChipNameActive: { color: theme.accent, fontWeight: '700' },

    chartCard: {
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 18,
      backgroundColor: theme.card,
      padding: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    attrs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    attrChip: {
      borderWidth: 1,
      borderColor: theme.chipBorder,
      backgroundColor: theme.chipBg,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    attrLabel: { color: theme.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
    attrValue: { color: theme.text, fontSize: 13, fontWeight: '600', marginTop: 1 },
  });
}
```

Notes for the implementer:
- Three animated blocks → three `Animated.Value`s (hero, picker, attributes). The spec text mentioned "four" by analogy to `EasternHome`, but this screen has three sections; use three to avoid an unused value.
- The previous version imported `chineseElementColor` and `useAppearance`; both imports are intentionally gone. Confirm no other references to them remain in the file after the rewrite.

- [ ] **Step 2: Typecheck the workspace**

Run: `npm run typecheck`
Expected: PASS with no errors (the root script typechecks shared + backend + frontend + mobile). If you prefer a faster loop, `cd mobile && npm run typecheck` typechecks mobile alone.

- [ ] **Step 3: Run the mobile test suite**

Run: `cd mobile && npm test`
Expected: PASS — the full suite (≈182 tests) stays green. `EasternChart` is presentational and has no dedicated test; `easternTheme.test.ts` (the palette/`scoreColor` tests it depends on) must still pass.

- [ ] **Step 4: Manual visual verification**

Launch the app (`cd mobile && npm start`), set zodiac mode to Eastern (Profile toggle), open the Chart tab, and confirm:
- Backdrop, hero card, animal picker chips, and attribute pills match Eastern Home / Compatibility in BOTH appearance modes (light = Ink & Jade, dark = Lunar Night, with the gold moon in dark).
- The staggered fade-in plays on entry.
- The user's own birth-year animal still shows the born/year meta line; other animals do not.
- Switch locale to `mn` and confirm labels render.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/chart/EasternChart.tsx docs/superpowers/specs/2026-06-26-eastern-birth-chart-redesign-design.md docs/superpowers/plans/2026-06-26-eastern-birth-chart-redesign.md
git commit -m "feat(mobile): redesign Eastern birth chart with Ink & Jade / Lunar Night theme"
```

---

## Self-Review

**Spec coverage:**
- Theme source swap → Step 1 (imports + `useEasternTheme`/`makeStyles`). ✓
- Backdrop (glow orbs + moon) → `bgDecor` block + styles. ✓
- Hero card (eyebrow, subtitle, emoji+name, born/year meta) → Hero section + styles. ✓
- Horizontal animal picker re-skin → Animal picker section + picker styles. ✓
- Attribute chips re-skin → Attributes section + `attrChip`/`attrLabel`/`attrValue`. ✓
- Staggered fade-in → `opacities` + `Animated.stagger`. ✓
- Drop per-element accent (`chineseElementColor`) → removed import, single `theme.accent` throughout. ✓
- Out-of-scope items (no new graphics, no data/i18n/routing changes) → respected; only `EasternChart.tsx` modified. ✓
- Testing (typecheck + mobile suite + manual) → Steps 2–4. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to" — full file content is inline. ✓

**Type consistency:** `EasternPalette` used by `makeStyles` matches the import; `ChineseAnimal` state type matches `CHINESE_ANIMAL_ORDER`/`getChineseAnimalInfo`; `EasternChart(): ReactElement` matches the `ChartScreen.tsx` consumer. ✓
