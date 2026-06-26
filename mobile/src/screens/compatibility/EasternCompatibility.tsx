import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { CHINESE_ANIMAL_ORDER, getChineseAnimalInfo } from '@astralis/lib/chineseZodiac';
import type { ChineseAnimal } from '@astralis/lib/types';
import { LoadingBlock } from '../../components/LoadingBlock';
import { ScreenScroll } from '../../components/ScreenScroll';
import { spacing, MIN_TOUCH } from '../../theme';
import { useI18n } from '../../i18n';
import { useChineseCompatibility } from '../../hooks/useChineseCompatibility';
import { useEasternTheme, scoreColor, type EasternPalette } from '../home/easternTheme';

/**
 * Compatibility content when the Eastern zodiac mode is selected (see
 * useZodiacMode): animal-to-animal harmony instead of sign-to-sign. Shares the
 * Eastern Home identity (Ink & Jade / Lunar Night) via useEasternTheme.
 */
export function EasternCompatibility(): ReactElement {
  const theme = useEasternTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { result, loading, error, compareAnimals } = useChineseCompatibility();
  const [animal1, setAnimal1] = useState<ChineseAnimal>('rat');
  const [animal2, setAnimal2] = useState<ChineseAnimal>('dragon');

  const animalName = useCallback((a: ChineseAnimal) => t(`chinese.animals.${a}`), [t]);
  const animalEmoji = useCallback((a: ChineseAnimal) => getChineseAnimalInfo(a).emoji, []);

  const metrics = useMemo(() => {
    if (!result) return [];
    return [
      { label: t('chinese.love'), value: result.loveScore },
      { label: t('chinese.friendship'), value: result.friendshipScore },
      { label: t('chinese.communication'), value: result.communicationScore },
    ];
  }, [result, t]);

  // Staggered fade-in, mirroring the Eastern Home entrance motion.
  const opacities = useMemo(() => Array.from({ length: 4 }, () => new Animated.Value(0)), []);
  useEffect(() => {
    const anims = opacities.map((o) =>
      Animated.timing(o, { toValue: 1, duration: 420, useNativeDriver: true }),
    );
    Animated.stagger(80, anims).start();
  }, [opacities]);

  function renderAnimalGrid(selected: ChineseAnimal, onPick: (a: ChineseAnimal) => void): ReactElement {
    return (
      <View style={styles.animalGrid}>
        {CHINESE_ANIMAL_ORDER.map((a) => {
          const active = a === selected;
          return (
            <Pressable
              key={a}
              onPress={() => onPick(a)}
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
    );
  }

  return (
    <ScreenScroll scrollBackgroundColor={theme.bgBase}>
      <View style={styles.bgDecor} pointerEvents="none">
        <View style={[styles.glow, styles.glowA]} />
        <View style={[styles.glow, styles.glowB]} />
        {theme.moon ? <View style={styles.moon} /> : null}
      </View>

      {/* Header */}
      <Animated.View style={{ opacity: opacities[0]! }}>
        <Text style={styles.subtitle}>{t('chinese.compatSubtitle')}</Text>
      </Animated.View>

      {/* Pair pickers */}
      <Animated.View style={{ opacity: opacities[1]! }}>
        <Text style={styles.sectionLabel}>{t('chinese.firstAnimal')}</Text>
        {renderAnimalGrid(animal1, setAnimal1)}
        <Text style={styles.sectionLabel}>{t('chinese.secondAnimal')}</Text>
        {renderAnimalGrid(animal2, setAnimal2)}

        <Text style={styles.pairPreview}>
          {animalEmoji(animal1)} {animalName(animal1)} ☯ {animalEmoji(animal2)} {animalName(animal2)}
        </Text>

        <Pressable
          onPress={() => void compareAnimals(animal1, animal2)}
          style={({ pressed }) => [styles.computeBtn, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.computeText}>☯ {t('chinese.compute')}</Text>
        </Pressable>
      </Animated.View>

      {/* Result */}
      <Animated.View style={{ opacity: opacities[2]! }}>
        {loading ? (
          <LoadingBlock message={t('chinese.aligning')} />
        ) : result ? (
          <View style={styles.resultCard}>
            <Text style={styles.pair}>
              {animalEmoji(result.animal1)} {animalName(result.animal1)} ☯ {animalEmoji(result.animal2)} {animalName(result.animal2)}
            </Text>
            <Text style={styles.overallLabel}>{t('chinese.overallHarmony')}</Text>
            <Text style={[styles.overallScore, { color: scoreColor(result.overallScore, theme) }]}>
              {result.overallScore}%
            </Text>
            {metrics.map((m) => (
              <View key={m.label} style={styles.metric}>
                <View style={styles.metricTop}>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={{ color: scoreColor(m.value, theme), fontWeight: '700' }}>{m.value}%</Text>
                </View>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${m.value}%`, backgroundColor: scoreColor(m.value, theme) }]} />
                </View>
              </View>
            ))}
            <Text style={styles.summary}>{result.summary}</Text>
            {result.highlights.map((h, i) => (
              <Text key={i} style={styles.highlight}>
                • {h}
              </Text>
            ))}
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}
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

    subtitle: { color: theme.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.md },

    sectionLabel: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: spacing.sm,
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

    pairPreview: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: spacing.md,
    },
    computeBtn: {
      minHeight: MIN_TOUCH,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
      backgroundColor: theme.accent,
    },
    computeText: { color: theme.onAccent, fontWeight: '900', fontSize: 15 },
    pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },

    resultCard: {
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 18,
      backgroundColor: theme.card,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    pair: { color: theme.text, fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    overallLabel: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    overallScore: { fontSize: 40, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
    metric: { marginBottom: 10 },
    metricTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    metricLabel: { color: theme.textMuted, fontSize: 13 },
    bar: { height: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: theme.divider },
    barFill: { height: '100%', borderRadius: 999 },
    summary: { color: theme.text, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 8 },
    highlight: { color: theme.textMuted, fontSize: 13, lineHeight: 20, marginTop: 4 },
    error: { color: theme.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: spacing.lg },
  });
}
