import React, { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHINESE_ANIMAL_ORDER, getChineseAnimalInfo, chineseElementColor } from '@astralis/lib/chineseZodiac';
import type { ChineseAnimal } from '@astralis/lib/types';
import { CosmicCard } from '../../components/CosmicCard';
import { ScreenScroll } from '../../components/ScreenScroll';
import { spacing } from '../../theme';
import { useAppearance } from '../../hooks/useAppearance';
import { useI18n } from '../../i18n';
import { useChineseZodiac } from '../../hooks/useChineseZodiac';

/**
 * Chart content when the Eastern zodiac mode is selected (see useZodiacMode).
 * Shows the lunar birth chart: the selected animal's fixed element, polarity,
 * trine group, and harmonizing/clashing signs. Anchored to the signed-in user's
 * birth-year animal when available. Mirrors the web ChineseChartPage.
 */
export function EasternChart(): ReactElement {
  const { palette } = useAppearance();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

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

  const info = getChineseAnimalInfo(animal);
  const showsYearDetails = profile !== null && profile.animal === animal;
  const accent = chineseElementColor(showsYearDetails && profile ? profile.element : info.fixedElement);

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
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + spacing.md }}>
      <Text style={[styles.title, { color: palette.text }]}>{t('chinese.chartTitle')}</Text>
      <Text style={[styles.subtitle, { color: palette.textMuted }]}>{t('chinese.chartSubtitle')}</Text>

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

      <View style={[styles.chartCard, { borderLeftColor: accent, backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.chartHead}>
          <Text style={styles.chartEmoji}>{animalEmoji(animal)}</Text>
          <View style={styles.chartHeadBody}>
            <Text style={[styles.chartLabel, { color: palette.textMuted }]}>{t('chinese.yourSign')}</Text>
            <Text style={[styles.chartName, { color: accent }]}>{animalName(animal)}</Text>
            {showsYearDetails && profile ? (
              <Text style={[styles.chartMeta, { color: palette.textMuted }]}>
                {t('chinese.born', { animal: animalName(animal) })} · {profile.zodiacYear}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.attrs}>
          {attrs.map((a) => (
            <View key={a.label} style={[styles.attrChip, { borderColor: palette.border }]}>
              <Text style={[styles.attrLabel, { color: palette.textMuted }]}>{a.label}</Text>
              <Text style={[styles.attrValue, { color: palette.text }]}>{a.value}</Text>
            </View>
          ))}
        </View>
      </View>
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
  chartCard: { marginTop: spacing.md, borderRadius: 16, borderWidth: 1, borderLeftWidth: 3, padding: spacing.md, gap: spacing.md },
  chartHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chartEmoji: { fontSize: 48 },
  chartHeadBody: { flex: 1 },
  chartLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  chartName: { fontSize: 24, fontWeight: '700', marginTop: 2 },
  chartMeta: { fontSize: 13, marginTop: 2 },
  attrs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attrChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  attrLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  attrValue: { fontSize: 13, fontWeight: '600', marginTop: 1 },
});
