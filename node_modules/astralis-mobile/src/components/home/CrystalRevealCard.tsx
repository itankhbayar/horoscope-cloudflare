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
  crystalName: string;
  todayBody: string;
  periodBody: (period: HoroscopePeriod) => string;
  period: HoroscopePeriod;
  onPeriodChange: (period: HoroscopePeriod) => void;
  isPremium: boolean;
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
    heroWrap: {
      borderRadius: 16,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: t.artWellBorder,
      backgroundColor: t.artWellBg,
      position: 'relative',
      overflow: 'hidden',
    },
    heroBgGlow: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 999,
      top: -95,
      right: -30,
      backgroundColor: t.glowLavender,
      opacity: 0.28,
    },
    heroBgGlow2: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 999,
      bottom: -80,
      left: -50,
      backgroundColor: t.bgAccent,
      opacity: 0.22,
    },
    heroTitle: {
      color: t.text,
      fontSize: 19,
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
    crystalsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 102,
      paddingHorizontal: spacing.xs,
    },
    crystal: {
      width: 46,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      backgroundColor: 'rgba(185, 194, 255, 0.28)',
      overflow: 'hidden',
    },
    c1: { height: 78, transform: [{ skewX: '-6deg' }] },
    c2: { height: 84, transform: [{ skewX: '6deg' }] },
    c3: { height: 96 },
    c4: { height: 88, transform: [{ skewX: '-5deg' }] },
    c5: { height: 82, transform: [{ skewX: '5deg' }] },
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
  });
}

export function CrystalRevealCard({
  crystalName,
  todayBody,
  periodBody,
  period,
  onPeriodChange,
  isPremium,
}: Props): ReactElement {
  const t = useSanctuaryTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [revealed, setRevealed] = useState(false);
  const revealProgress = useRef(new Animated.Value(0)).current;

  const lockedForFreeUser = !isPremium && period !== 'today';
  const visibleBody = lockedForFreeUser || period === 'today' ? todayBody : periodBody(period);
  const showDetails = revealed && !lockedForFreeUser;

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

  const detailsStyle = {
    opacity: revealProgress,
    transform: [
      { translateY: revealProgress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      { scale: revealProgress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
    ],
  } as const;

  return (
    <ContentCard>
      <Text style={styles.title} accessibilityRole="header">
        Today's Crystal
      </Text>
      <Text style={styles.subtitle}>
        Tune into your mineral guide and reveal the message your energy is ready to receive.
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
          <View style={styles.heroWrap} accessibilityRole="image" accessibilityLabel={`Crystal illustration for ${crystalName}`}>
            <View style={styles.heroBgGlow} pointerEvents="none" />
            <View style={styles.heroBgGlow2} pointerEvents="none" />
            <Text style={styles.heroTitle}>{revealed ? crystalName : 'A crystal is calling you'}</Text>
            <Text style={styles.teaser}>
              {revealed
                ? 'Your crystal has been revealed. Breathe in, and receive your guidance below.'
                : 'Clear your mind, set an intention, and uncover your crystal guidance.'}
            </Text>
            <View style={styles.crystalsRow}>
              <View style={[styles.crystal, styles.c1]} />
              <View style={[styles.crystal, styles.c2]} />
              <View style={[styles.crystal, styles.c3]} />
              <View style={[styles.crystal, styles.c4]} />
              <View style={[styles.crystal, styles.c5]} />
            </View>
          </View>
          <CTAButton
            label={revealed ? 'Crystal Revealed' : 'Reveal Crystal'}
            onPress={onReveal}
            variant="white"
            style={styles.cta}
            accessibilityLabel={revealed ? 'Crystal details are revealed' : 'Reveal crystal guidance'}
          />
          {showDetails ? (
            <Animated.View
              style={[styles.details, detailsStyle]}
              accessibilityRole="summary"
              accessibilityLabel="Expanded crystal guidance"
            >
              <Text style={styles.detailsTitle}>{crystalName}</Text>
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
