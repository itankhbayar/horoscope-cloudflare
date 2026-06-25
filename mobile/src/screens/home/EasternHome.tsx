import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHINESE_ANIMAL_ORDER, getChineseAnimalInfo } from '@astralis/lib/chineseZodiac';
import type { ChineseAnimal } from '@astralis/lib/types';
import { LoadingBlock } from '../../components/LoadingBlock';
import { ScreenScroll } from '../../components/ScreenScroll';
import { spacing } from '../../theme';
import { useI18n } from '../../i18n';
import { useProfile } from '../../hooks/useProfile';
import { useChineseZodiac, type ChinesePeriod } from '../../hooks/useChineseZodiac';
import { useEasternTheme, type EasternPalette } from './easternTheme';

const PERIODS: { key: ChinesePeriod; label: 'period.today' | 'period.weekly' | 'period.monthly' | 'period.yearly' }[] = [
  { key: 'daily', label: 'period.today' },
  { key: 'weekly', label: 'period.weekly' },
  { key: 'monthly', label: 'period.monthly' },
  { key: 'yearly', label: 'period.yearly' },
];

/**
 * Home content when the Eastern zodiac mode is selected (see useZodiacMode).
 * Distinct visual identity from the Western Home: Ink & Jade (light) / Lunar
 * Night (dark) via useEasternTheme. Same data flow as before — animal-sign
 * daily/period reading anchored to the signed-in user's birth-year animal.
 */
export function EasternHome(): ReactElement {
  const theme = useEasternTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { profile: chinese, reading, loading, error, loadProfile, loadReading } = useChineseZodiac();
  const { profile, load: loadUserProfile } = useProfile();
  const [animal, setAnimal] = useState<ChineseAnimal>('dragon');
  const [period, setPeriod] = useState<ChinesePeriod>('daily');

  const animalName = useCallback((a: ChineseAnimal) => t(`chinese.animals.${a}`), [t]);
  const animalEmoji = useCallback((a: ChineseAnimal) => getChineseAnimalInfo(a).emoji, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    void loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    if (chinese) setAnimal(chinese.animal);
  }, [chinese]);

  useEffect(() => {
    void loadReading(animal, period);
  }, [animal, period, loadReading]);

  const displayName = useMemo(() => {
    const u = profile?.user;
    if (!u) return t('home.defaultName');
    const n = (u.displayName ?? u.fullName).trim();
    return n || t('home.defaultName');
  }, [profile?.user, t]);

  // Staggered fade-in, mirroring the Western Home entrance motion.
  const opacities = useMemo(() => Array.from({ length: 4 }, () => new Animated.Value(0)), []);
  useEffect(() => {
    const anims = opacities.map((o) =>
      Animated.timing(o, { toValue: 1, duration: 420, useNativeDriver: true }),
    );
    Animated.stagger(80, anims).start();
  }, [opacities]);

  const blocks = reading
    ? [
        { title: t('chinese.overall'), body: reading.overall },
        { title: t('chinese.love'), body: reading.love },
        { title: t('chinese.career'), body: reading.career },
        { title: t('chinese.health'), body: reading.health },
      ]
    : [];

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
          <Text style={styles.eyebrow}>{'✧  ' + t('home.easternTitle')}</Text>
          <Text style={styles.greeting}>{t('home.greeting', { name: displayName })}</Text>
          {chinese ? (
            <>
              <View style={styles.heroRow}>
                <Text style={styles.heroEmoji}>{animalEmoji(chinese.animal)}</Text>
                <View style={styles.heroBody}>
                  <Text style={styles.heroName}>{animalName(chinese.animal)}</Text>
                  <Text style={styles.heroMeta}>
                    {t('chinese.born', { animal: animalName(chinese.animal) })} · {chinese.zodiacYear}
                  </Text>
                </View>
              </View>
              <View style={styles.chips}>
                <Text style={styles.chip}>
                  {t('chinese.element')}: {t(`chinese.elements.${chinese.element}`)}
                </Text>
                <Text style={styles.chip}>
                  {chinese.yinYang === 'yang' ? t('chinese.yang') : t('chinese.yin')}
                </Text>
                <Text style={styles.chip}>
                  {t('chinese.luckyNumbers')}: {chinese.luckyNumbers.join(', ')}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.heroSub}>{t('home.easternSubtitle')}</Text>
          )}
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

      {/* Period tabs */}
      <Animated.View style={{ opacity: opacities[2]! }}>
        <View style={styles.periodRow}>
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <Pressable
                key={p.key}
                onPress={() => setPeriod(p.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.periodBtn, active && styles.periodBtnActive]}
              >
                <Text style={[styles.periodText, active && styles.periodTextActive]}>{t(p.label)}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Reading */}
      <Animated.View style={{ opacity: opacities[3]! }}>
        {loading ? (
          <LoadingBlock message={t('chinese.loading')} />
        ) : reading ? (
          <View style={styles.readingCard}>
            <Text style={styles.readingTitle}>{`${animalEmoji(animal)}  ${animalName(animal)}`}</Text>
            {blocks.map((b) => (
              <View key={b.title} style={styles.block}>
                <Text style={styles.blockTitle}>{b.title}</Text>
                <Text style={styles.blockBody}>{b.body}</Text>
              </View>
            ))}
            <View style={styles.lucky}>
              <Text style={styles.luckyText}>
                {t('chinese.luckyNumber')}: {reading.luckyNumber}
              </Text>
              <Text style={styles.luckyText}>
                {t('chinese.luckyColor')}: {reading.luckyColor}
              </Text>
            </View>
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

    heroCard: {
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 20,
      backgroundColor: theme.card,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    eyebrow: { color: theme.accent, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
    greeting: { color: theme.text, fontSize: 22, fontWeight: '900', marginTop: 6 },
    heroSub: { color: theme.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8 },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.md },
    heroEmoji: { fontSize: 48 },
    heroBody: { flex: 1 },
    heroName: { color: theme.animalName, fontSize: 24, fontWeight: '900' },
    heroMeta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
    chip: {
      color: theme.accent,
      fontSize: 11,
      fontWeight: '700',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.chipBorder,
      backgroundColor: theme.chipBg,
      overflow: 'hidden',
    },

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

    periodRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.lg, marginBottom: spacing.lg },
    periodBtn: {
      flex: 1,
      minHeight: 40,
      borderWidth: 1,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: theme.cardBorder,
      backgroundColor: 'transparent',
    },
    periodBtnActive: { borderColor: theme.accent, backgroundColor: theme.accent },
    periodText: { color: theme.textMuted, fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
    periodTextActive: { color: theme.onAccent },

    readingCard: {
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 18,
      backgroundColor: theme.card,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    readingTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm },
    block: { marginBottom: 12 },
    blockTitle: {
      color: theme.accent,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    blockBody: { color: theme.text, fontSize: 14, lineHeight: 22 },
    lucky: {
      flexDirection: 'row',
      gap: 18,
      flexWrap: 'wrap',
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.divider,
    },
    luckyText: { color: theme.textMuted, fontSize: 13 },
    error: { color: theme.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: spacing.lg },
  });
}
