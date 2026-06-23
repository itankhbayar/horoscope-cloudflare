import React, { useCallback, useMemo, useState, type ReactElement } from 'react';
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
import { useChineseCompatibility } from '../../hooks/useChineseCompatibility';

function scoreColor(score: number): string {
  if (score >= 80) return '#7bbf6a';
  if (score >= 60) return '#e8d48b';
  if (score >= 40) return '#ff8a5c';
  return '#ff6b6b';
}

/**
 * Compatibility content when the Eastern zodiac mode is selected (see
 * useZodiacMode): animal-to-animal harmony instead of sign-to-sign. Mirrors the
 * compatibility half of the Lunar tab and the web ChineseCompatibilityPage.
 */
export function EasternCompatibility(): ReactElement {
  const { palette } = useAppearance();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

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

  function renderAnimalRow(selected: ChineseAnimal, onPick: (a: ChineseAnimal) => void): ReactElement {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.animalRow}>
        {CHINESE_ANIMAL_ORDER.map((a) => {
          const active = a === selected;
          return (
            <Pressable
              key={a}
              onPress={() => onPick(a)}
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
    );
  }

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + spacing.md }}>
      <Text style={[styles.title, { color: palette.text }]}>{t('chinese.compatTitle')}</Text>
      <Text style={[styles.subtitle, { color: palette.textMuted }]}>{t('chinese.compatSubtitle')}</Text>

      <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>{t('chinese.firstAnimal')}</Text>
      {renderAnimalRow(animal1, setAnimal1)}
      <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>{t('chinese.secondAnimal')}</Text>
      {renderAnimalRow(animal2, setAnimal2)}

      <Pressable
        onPress={() => void compareAnimals(animal1, animal2)}
        style={[styles.computeBtn, { backgroundColor: palette.accent }]}
        accessibilityRole="button"
      >
        <Text style={styles.computeText}>☯ {t('chinese.compute')}</Text>
      </Pressable>

      {loading ? (
        <LoadingBlock message={t('chinese.aligning')} />
      ) : result ? (
        <CosmicCard>
          <Text style={[styles.pair, { color: palette.text }]}>
            {animalEmoji(result.animal1)} {animalName(result.animal1)} ☯ {animalEmoji(result.animal2)} {animalName(result.animal2)}
          </Text>
          <Text style={[styles.overallLabel, { color: palette.textMuted }]}>{t('chinese.overallHarmony')}</Text>
          <Text style={[styles.overallScore, { color: scoreColor(result.overallScore) }]}>{result.overallScore}%</Text>
          {metrics.map((m) => (
            <View key={m.label} style={styles.metric}>
              <View style={styles.metricTop}>
                <Text style={[styles.metricLabel, { color: palette.textMuted }]}>{m.label}</Text>
                <Text style={{ color: scoreColor(m.value) }}>{m.value}%</Text>
              </View>
              <View style={[styles.bar, { backgroundColor: palette.border }]}>
                <View style={[styles.barFill, { width: `${m.value}%`, backgroundColor: scoreColor(m.value) }]} />
              </View>
            </View>
          ))}
          <Text style={[styles.summary, { color: palette.text }]}>{result.summary}</Text>
          {result.highlights.map((h, i) => (
            <Text key={i} style={[styles.highlight, { color: palette.textMuted }]}>• {h}</Text>
          ))}
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
  sectionLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: 6 },
  animalRow: { gap: 8, paddingVertical: 2, paddingRight: spacing.md },
  animalChip: { width: 72, alignItems: 'center', gap: 4, paddingVertical: 8, borderWidth: 1, borderRadius: 12 },
  animalEmoji: { fontSize: 24 },
  animalName: { fontSize: 11 },
  computeBtn: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: 999, marginTop: spacing.md },
  computeText: { color: '#151326', fontWeight: '700', fontSize: 15 },
  pair: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  overallLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  overallScore: { fontSize: 40, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  metric: { marginBottom: 10 },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metricLabel: { fontSize: 13 },
  bar: { height: 6, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  summary: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 8 },
  highlight: { fontSize: 13, lineHeight: 20, marginTop: 4 },
  error: { fontSize: 14, textAlign: 'center', paddingVertical: spacing.lg },
});
