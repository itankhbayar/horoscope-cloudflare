import React, { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { CTAButton } from './CTAButton';
import { ContentCard } from './ContentCard';
import { HoroscopeTabs } from './HoroscopeTabs';
import { CHRONO_TABS } from './chronoTabs';
import type { HoroscopePeriod } from './homeDateUtils';
import { useSanctuaryTheme, type SanctuaryPalette } from './sanctuaryTheme';
import { spacing } from '../../theme';

type Props = {
  title: "Today's Transit" | "Today's Moon";
  period: HoroscopePeriod;
  onPeriodChange: (period: HoroscopePeriod) => void;
  isPremium: boolean;
  todayBody: string;
  periodBody: (period: HoroscopePeriod) => string;
  ctaLabel: string;
  revealedCtaLabel: string;
};

function makeStyles(t: SanctuaryPalette) {
  return StyleSheet.create({
    title: {
      alignSelf: 'center',
      color: t.text,
      fontSize: 34,
      fontWeight: '800',
      marginBottom: spacing.xs,
      letterSpacing: 0.2,
    },
    subtitle: {
      color: t.textSoft,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    premiumHint: {
      color: t.textSoft,
      fontSize: 12,
      lineHeight: 16,
      marginBottom: spacing.sm,
    },
    lockWrap: { position: 'relative' },
    lockDim: { opacity: 0.4 },
    lockOverlay: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      top: '44%',
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
    heroWrap: {
      borderRadius: 16,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: t.artWellBorder,
      backgroundColor: t.artWellBg,
      overflow: 'hidden',
      position: 'relative',
      minHeight: 206,
      justifyContent: 'space-between',
    },
    heroGlow: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 999,
      top: -85,
      right: -35,
      backgroundColor: t.glowLavender,
      opacity: 0.26,
    },
    heroGlow2: {
      position: 'absolute',
      width: 190,
      height: 190,
      borderRadius: 999,
      bottom: -90,
      left: -45,
      backgroundColor: t.bgAccent,
      opacity: 0.22,
    },
    heroTitle: {
      color: t.text,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 6,
    },
    teaser: {
      color: t.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    cta: { alignSelf: 'stretch', marginBottom: spacing.sm },
    details: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.cardBorder,
      backgroundColor: t.surfaceTint,
      padding: spacing.md,
      overflow: 'hidden',
    },
    detailsTitle: {
      color: t.text,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 6,
    },
    detailsBody: {
      color: t.textMuted,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: '500',
    },
    planetWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: spacing.sm,
    },
    transitPlanet: {
      width: 128,
      height: 128,
      borderRadius: 999,
      backgroundColor: 'rgba(220, 221, 255, 0.9)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.34)',
      shadowColor: '#ffffff',
      shadowOpacity: 0.28,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      elevation: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    transitRing: {
      position: 'absolute',
      width: 186,
      height: 56,
      borderRadius: 999,
      borderWidth: 4,
      borderColor: 'rgba(216, 221, 255, 0.7)',
      transform: [{ rotate: '-8deg' }],
      backgroundColor: 'transparent',
    },
    moonOrb: {
      width: 128,
      height: 128,
      borderRadius: 999,
      backgroundColor: 'rgba(229, 232, 255, 0.92)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      shadowColor: '#ffffff',
      shadowOpacity: 0.24,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 0 },
      elevation: 2,
    },
  });
}

export function InsightRevealCard({
  title,
  period,
  onPeriodChange,
  isPremium,
  todayBody,
  periodBody,
  ctaLabel,
  revealedCtaLabel,
}: Props): ReactElement {
  const t = useSanctuaryTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [revealed, setRevealed] = useState(false);
  const revealProgress = useRef(new Animated.Value(0)).current;

  const lockedForFreeUser = !isPremium && period !== 'today';
  const showDetails = revealed && !lockedForFreeUser;
  const visibleBody = lockedForFreeUser || period === 'today' ? todayBody : periodBody(period);

  useEffect(() => {
    Animated.timing(revealProgress, {
      toValue: showDetails ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [revealProgress, showDetails]);

  const onReveal = () => {
    if (lockedForFreeUser) return;
    setRevealed(true);
  };

  return (
    <ContentCard>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.subtitle}>
        {title === "Today's Transit"
          ? 'Follow the sky movement and reveal your cosmic transit guidance.'
          : 'Tune into lunar energy and reveal your moon cycle message.'}
      </Text>
      <HoroscopeTabs
        tabs={CHRONO_TABS}
        activeId={period}
        onSelect={(id) => onPeriodChange(id as HoroscopePeriod)}
        accentUnderline
      />
      {!isPremium ? <Text style={styles.premiumHint}>Free plan includes Today. Upgrade to unlock all periods.</Text> : null}

      <View style={styles.lockWrap}>
        <View style={lockedForFreeUser ? styles.lockDim : null}>
          <View style={styles.heroWrap}>
            <View style={styles.heroGlow} pointerEvents="none" />
            <View style={styles.heroGlow2} pointerEvents="none" />
            <Text style={styles.heroTitle}>{revealed ? title.replace("Today's ", '') : 'A cosmic insight awaits'}</Text>
            <Text style={styles.teaser}>
              {revealed
                ? 'Your insight is open. Pause, breathe, and receive the message below.'
                : 'Tap reveal to unlock the guidance written in today’s sky.'}
            </Text>
            <View style={styles.planetWrap}>
              {title === "Today's Transit" ? (
                <View style={styles.transitPlanet} accessibilityRole="image" accessibilityLabel="Transit planet illustration">
                  <View style={styles.transitRing} />
                </View>
              ) : (
                <View style={styles.moonOrb} accessibilityRole="image" accessibilityLabel="Moon illustration" />
              )}
            </View>
          </View>

          <CTAButton
            label={revealed ? revealedCtaLabel : ctaLabel}
            onPress={onReveal}
            variant="white"
            style={styles.cta}
            accessibilityLabel={revealed ? 'Insight details are revealed' : `Reveal ${title.replace("Today's ", '').toLowerCase()} guidance`}
          />

          {showDetails ? (
            <Animated.View
              style={[
                styles.details,
                {
                  opacity: revealProgress,
                  transform: [
                    { translateY: revealProgress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                    { scale: revealProgress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
                  ],
                },
              ]}
              accessibilityRole="summary"
              accessibilityLabel="Expanded insight guidance"
            >
              <Text style={styles.detailsTitle}>{title.replace("Today's ", '')}</Text>
              <Text style={styles.detailsBody}>{visibleBody}</Text>
            </Animated.View>
          ) : null}
        </View>
        {lockedForFreeUser ? (
          <View style={styles.lockOverlay} accessibilityRole="text" accessibilityLabel="Locked. Premium required for this period.">
            <Text style={styles.lockText}>{'\uD83D\uDD12'} Unlock this content</Text>
          </View>
        ) : null}
      </View>
    </ContentCard>
  );
}
