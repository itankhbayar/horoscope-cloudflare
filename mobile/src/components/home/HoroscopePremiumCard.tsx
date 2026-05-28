import React, { type ReactElement, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DailyHoroscope } from '@astralis/lib/types';
import { getZodiacInfo } from '@astralis/lib/zodiac';
import type { HoroscopePeriod } from './homeDateUtils';
import { compressRitualCopy } from './ritualMomentCopy';
import { buildHoroscopeDetailSections } from './horoscopeDetail';
import { useSanctuaryTheme } from './sanctuaryTheme';
import { spacing } from '../../theme';

type Props = {
  horoscope: DailyHoroscope | null;
  period: HoroscopePeriod;
  onPeriodChange: (p: HoroscopePeriod) => void;
  isPremium: boolean;
  loading: boolean;
  error: string | null;
  onLearnMore?: () => void;
};

export function HoroscopePremiumCard({
  horoscope,
  period,
  onPeriodChange,
  isPremium,
  loading,
  error,
  onLearnMore,
}: Props): ReactElement {
  void onPeriodChange;
  void onLearnMore;
  const t = useSanctuaryTheme();
  const [expanded, setExpanded] = useState(false);

  const art = useMemo(() => {
    if (!horoscope) return { sym: '✨', name: 'your sky' };
    const z = getZodiacInfo(horoscope.sign);
    return { sym: z.symbol, name: z.name };
  }, [horoscope]);

  const headline = horoscope
    ? compressRitualCopy(horoscope.overall, 132)
    : loading
    ? 'Өнөөдрийн тэнгэрийг зурагласаж байна...'
    : 'Таны уншлага энд гарч ирнэ.';

  const detailSections = horoscope
    ? buildHoroscopeDetailSections(horoscope, period, isPremium)
    : [];
  const detail = detailSections.length > 0 ? 'ready' : (error ?? undefined);

  const hasDetail = Boolean(detail);

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: t.cardBorder,
          backgroundColor: t.card,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Tonight's reading: ${headline}`}
    >
      {/* Decorative background orb */}
      <View style={[styles.bgOrb, { backgroundColor: t.lavender }]} pointerEvents="none" />

      {/* Header row: eyebrow + sign badge */}
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: t.textMuted }]}>✦ Өнөөдрийн уншлага</Text>
        <View style={[styles.signBadge, { borderColor: t.artWellBorder, backgroundColor: t.artWellBg }]}>
          {loading ? (
            <ActivityIndicator color={t.lavender} size="small" accessibilityLabel="Loading" />
          ) : (
            <>
              <Text style={[styles.signSymbol, { color: t.lavender }]} allowFontScaling={false}>
                {art.sym}
              </Text>
              <Text style={[styles.signName, { color: t.textMuted }]} allowFontScaling={false}>
                {art.name}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Main headline — the hero text */}
      <Text style={[styles.headline, { color: t.text }]}>
        {error ? 'Уншлага одоохондоо тогтсонгүй.' : headline}
      </Text>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: t.cardBorder }]} />

      {/* Expanded detail */}
      {expanded && detail ? (
        <View style={styles.detailStack}>
          {detailSections.map((section) => (
            <View key={section.key} style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: t.lavender }]}>{section.title}</Text>
              <Text style={[styles.detail, { color: t.textMuted }]}>{section.body}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Expand / collapse CTA */}
      {hasDetail ? (
        <Pressable
          style={({ pressed }) => [
            styles.expandButton,
            {
              borderColor: expanded
                ? 'rgba(184, 168, 255, 0.28)'
                : 'rgba(244, 217, 139, 0.32)',
              backgroundColor: expanded
                ? 'rgba(184, 168, 255, 0.08)'
                : 'rgba(244, 217, 139, 0.07)',
            },
            pressed && styles.pressed,
          ]}
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Хураах' : 'Арай гүнзгий унших'}
        >
          <Text
            style={[
              styles.expandText,
              { color: expanded ? t.lavender : '#f4d98b' },
            ]}
          >
            {expanded ? '↑ Хураах' : '↓ Арай гүнзгий унших'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  bgOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -110,
    top: -100,
    opacity: 0.07,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  signBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  signSymbol: {
    fontSize: 18,
    lineHeight: 22,
  },
  signName: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    opacity: 0.5,
    marginVertical: spacing.md,
  },
  detail: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  detailStack: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionBlock: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  expandButton: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
});
