import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
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
        <View style={styles.animalGrid}>
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
        </View>
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
    heroSub: { color: theme.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8 },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.md },
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
    animalGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    animalChip: {
      width: '23%',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      marginBottom: 8,
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
