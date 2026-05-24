import React, { type ReactElement, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { DailyHoroscope } from '@astralis/lib/types';
import { getZodiacInfo } from '@astralis/lib/zodiac';
import { CTAButton } from './CTAButton';
import { ContentCard } from './ContentCard';
import { HoroscopeTabs } from './HoroscopeTabs';
import { CHRONO_TABS } from './chronoTabs';
import { clampSnippet } from './homeContentUtils';
import type { HoroscopePeriod } from './homeDateUtils';
import { useSanctuaryTheme, type SanctuaryPalette } from './sanctuaryTheme';
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

function makeStyles(t: SanctuaryPalette) {
  return StyleSheet.create({
    cardTitle: {
      alignSelf: 'center',
      color: t.text,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: spacing.xs,
    },
    error: { color: '#ff8b8b', marginBottom: spacing.sm, fontSize: 14 },
    premiumHint: {
      color: t.textSoft,
      fontSize: 12,
      lineHeight: 16,
      marginBottom: spacing.sm,
    },
    rowWrap: {
      position: 'relative',
    },
    rowWrapLocked: {
      opacity: 0.45,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: spacing.md,
      marginBottom: spacing.lg,
      maxWidth: '100%',
    },
    lockOverlay: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      top: '32%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderRadius: 12,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
    },
    lockText: {
      color: '#1c1740',
      fontSize: 15,
      fontWeight: '700',
    },
    art: {
      width: 108,
      borderRadius: 16,
      backgroundColor: t.artWellBg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: t.artWellBorder,
    },
    artSym: { fontSize: 44, lineHeight: 50, color: t.lavender },
    artLabel: {
      marginTop: 6,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: t.textMuted,
    },
    copyCol: { flex: 1, minWidth: 0, justifyContent: 'center' },
    preview: {
      color: t.textMuted,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: '500',
    },
    previewDim: { opacity: 0.72 },
    spinner: { alignSelf: 'flex-start', marginBottom: 10 },
    cta: { alignSelf: 'stretch' },
  });
}

export function HoroscopePremiumCard({
  horoscope,
  period,
  onPeriodChange,
  isPremium,
  loading,
  error,
  onLearnMore,
}: Props): ReactElement {
  const t = useSanctuaryTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const art = useMemo(() => {
    if (!horoscope) return { sym: '\u2728', name: 'YOUR SIGN' };
    const z = getZodiacInfo(horoscope.sign);
    return { sym: z.symbol, name: z.name.toUpperCase() };
  }, [horoscope]);

  const preview = horoscope ? clampSnippet(horoscope.overall, 220) : '';
  const lockedForFreeUser = !isPremium && period !== 'today';

  return (
    <ContentCard>
      <Text style={styles.cardTitle} accessibilityRole="header">
        Sky Reading
      </Text>
      <HoroscopeTabs
        tabs={CHRONO_TABS}
        activeId={period}
        onSelect={(id) => onPeriodChange(id as HoroscopePeriod)}
        accentUnderline
      />
      {!isPremium ? <Text style={styles.premiumHint}>Today is included. Premium opens deeper timing layers without changing your core ritual.</Text> : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <View style={[styles.rowWrap, lockedForFreeUser ? styles.rowWrapLocked : null]}>
        <View style={styles.row}>
          <View style={styles.art} accessibilityLabel={`${art.name} symbol`}>
            <Text style={styles.artSym} allowFontScaling={false}>
              {art.sym}
            </Text>
            <Text style={styles.artLabel}>{art.name}</Text>
          </View>
          <View style={styles.copyCol}>
            {loading ? (
              <ActivityIndicator color={t.lavender} style={styles.spinner} accessibilityLabel="Loading horoscope" />
            ) : null}
            <Text
              style={[styles.preview, loading && preview ? styles.previewDim : null]}
              accessibilityLiveRegion="polite"
            >
              {preview || (loading ? "Mapping today's sky..." : 'Your sky reading will appear here.')}
            </Text>
          </View>
        </View>
        {lockedForFreeUser ? (
          <View style={styles.lockOverlay} accessibilityRole="text" accessibilityLabel="Locked. Premium required for this period.">
            <Text style={styles.lockText}>{'\uD83D\uDD12'} Open deeper sky layer</Text>
          </View>
        ) : null}
      </View>
      <CTAButton label="See how Astralis maps the sky" onPress={onLearnMore} style={styles.cta} />
    </ContentCard>
  );
}
