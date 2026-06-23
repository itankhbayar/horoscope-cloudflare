import React, { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHINESE_ANIMAL_ORDER, getChineseAnimalInfo } from '@astralis/lib/chineseZodiac';
import type { ChineseAnimal } from '@astralis/lib/types';
import { CosmicCard } from '../../components/CosmicCard';
import { LoadingBlock } from '../../components/LoadingBlock';
import { ScreenScroll } from '../../components/ScreenScroll';
import { spacing, MIN_TOUCH } from '../../theme';
import { useAppearance } from '../../hooks/useAppearance';
import { useI18n } from '../../i18n';
import { useChineseZodiac, type ChinesePeriod } from '../../hooks/useChineseZodiac';

const PERIODS: { key: ChinesePeriod; label: 'period.today' | 'period.weekly' | 'period.monthly' | 'period.yearly' }[] = [
  { key: 'daily', label: 'period.today' },
  { key: 'weekly', label: 'period.weekly' },
  { key: 'monthly', label: 'period.monthly' },
  { key: 'yearly', label: 'period.yearly' },
];

/**
 * Home content when the Eastern zodiac mode is selected (see useZodiacMode).
 * Shows the animal-sign daily/period reading, anchored to the signed-in user's
 * birth-year animal when available. Mirrors the readings half of the Lunar tab.
 */
export function EasternHome(): ReactElement {
  const { palette } = useAppearance();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const { profile, reading, loading, error, loadProfile, loadReading } = useChineseZodiac();
  const [animal, setAnimal] = useState<ChineseAnimal>('dragon');
  const [period, setPeriod] = useState<ChinesePeriod>('daily');

  const animalName = useCallback((a: ChineseAnimal) => t(`chinese.animals.${a}`), [t]);
  const animalEmoji = useCallback((a: ChineseAnimal) => getChineseAnimalInfo(a).emoji, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile) setAnimal(profile.animal);
  }, [profile]);

  useEffect(() => {
    void loadReading(animal, period);
  }, [animal, period, loadReading]);

  const blocks = reading
    ? [
        { title: t('chinese.overall'), body: reading.overall },
        { title: t('chinese.love'), body: reading.love },
        { title: t('chinese.career'), body: reading.career },
        { title: t('chinese.health'), body: reading.health },
      ]
    : [];

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + spacing.md }}>
      <Text style={[styles.title, { color: palette.text }]}>{t('home.easternTitle')}</Text>
      <Text style={[styles.subtitle, { color: palette.textMuted }]}>{t('home.easternSubtitle')}</Text>

      {profile ? (
        <CosmicCard>
          <View style={styles.profileRow}>
            <Text style={styles.profileEmoji}>{animalEmoji(profile.animal)}</Text>
            <View style={styles.profileBody}>
              <Text style={[styles.profileLabel, { color: palette.textMuted }]}>{t('chinese.yourSign')}</Text>
              <Text style={[styles.profileName, { color: palette.accent }]}>{animalName(profile.animal)}</Text>
              <Text style={[styles.profileMeta, { color: palette.textMuted }]}>
                {t('chinese.born', { animal: animalName(profile.animal) })} · {profile.zodiacYear}
              </Text>
            </View>
          </View>
          <View style={styles.attrs}>
            <Text style={[styles.attr, { color: palette.textMuted }]}>{t('chinese.element')}: {t(`chinese.elements.${profile.element}`)}</Text>
            <Text style={[styles.attr, { color: palette.textMuted }]}>{t('chinese.polarity')}: {profile.yinYang === 'yang' ? t('chinese.yang') : t('chinese.yin')}</Text>
            <Text style={[styles.attr, { color: palette.textMuted }]}>{t('chinese.luckyNumbers')}: {profile.luckyNumbers.join(', ')}</Text>
          </View>
        </CosmicCard>
      ) : null}

      <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>{t('chinese.pickAnimal')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.animalRow}>
        {CHINESE_ANIMAL_ORDER.map((a) => {
          const active = a === animal;
          return (
            <Pressable
              key={a}
              onPress={() => setAnimal(a)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.animalChip,
                { borderColor: active ? palette.accent : palette.border, backgroundColor: active ? 'rgba(212,175,55,0.14)' : palette.card },
              ]}
            >
              <Text style={styles.animalEmoji}>{animalEmoji(a)}</Text>
              <Text style={[styles.animalName, { color: active ? palette.accent : palette.textMuted }]}>{animalName(a)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.periodRow}>
        {PERIODS.map((p) => {
          const active = p.key === period;
          return (
            <Pressable
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.periodBtn, { borderColor: active ? palette.accent : palette.border, backgroundColor: active ? palette.accent : 'transparent' }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.periodText, { color: active ? '#151326' : palette.textMuted }]}>{t(p.label)}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <LoadingBlock message={t('chinese.loading')} />
      ) : reading ? (
        <CosmicCard title={`${animalEmoji(animal)} ${animalName(animal)}`}>
          {blocks.map((b) => (
            <View key={b.title} style={styles.block}>
              <Text style={[styles.blockTitle, { color: palette.accent }]}>{b.title}</Text>
              <Text style={[styles.blockBody, { color: palette.text }]}>{b.body}</Text>
            </View>
          ))}
          <View style={[styles.lucky, { borderColor: palette.border }]}>
            <Text style={[styles.luckyText, { color: palette.textMuted }]}>{t('chinese.luckyNumber')}: {reading.luckyNumber}</Text>
            <Text style={[styles.luckyText, { color: palette.textMuted }]}>{t('chinese.luckyColor')}: {reading.luckyColor}</Text>
          </View>
        </CosmicCard>
      ) : error ? (
        <Text style={[styles.error, { color: palette.textMuted }]}>{error}</Text>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginTop: spacing.sm },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: spacing.md, lineHeight: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileEmoji: { fontSize: 44 },
  profileBody: { flex: 1 },
  profileLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  profileName: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  profileMeta: { fontSize: 12, marginTop: 2 },
  attrs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  attr: { fontSize: 12 },
  sectionLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: 6 },
  animalRow: { gap: 8, paddingVertical: 2, paddingRight: spacing.md },
  animalChip: { width: 72, alignItems: 'center', gap: 4, paddingVertical: 8, borderWidth: 1, borderRadius: 12 },
  animalEmoji: { fontSize: 24 },
  animalName: { fontSize: 11 },
  periodRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap' },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderRadius: 999 },
  periodText: { fontSize: 13, fontWeight: '600' },
  block: { marginBottom: 12 },
  blockTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  blockBody: { fontSize: 14, lineHeight: 22 },
  lucky: { flexDirection: 'row', gap: 18, flexWrap: 'wrap', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  luckyText: { fontSize: 13 },
  error: { fontSize: 14, textAlign: 'center', paddingVertical: spacing.lg },
});
