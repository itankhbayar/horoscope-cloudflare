import React, { type ReactElement, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ZodiacSign } from '@astralis/lib/types';
import { getZodiacInfo } from '@astralis/lib/zodiac';
import { useSanctuaryTheme, type SanctuaryPalette } from './sanctuaryTheme';
import { spacing } from '../../theme';
import {
  formatStreakRitual,
  formatFreezeSafeguard,
  freezeAwardCopy,
  milestoneCelebration,
  milestoneCopy,
  segmentCopy,
  type StreakMilestone,
  type StreakSegment,
} from '../../lib/streakDisplay';

const SUN = '\u2609';
const MOON = '\u263D';
const RISING = '\u2191';

type Props = {
  displayName: string;
  sunSign: ZodiacSign | null;
  moonSign: ZodiacSign | null;
  risingSign: ZodiacSign | null;
  streakCount?: number;
  streakFreezes?: number;
  streakFreezeAwarded?: boolean;
  streakPreservedByFreeze?: boolean;
  streakSegment?: StreakSegment;
  milestoneReached?: StreakMilestone | null;
  shareMilestone?: StreakMilestone | null;
  onShareMilestone?: () => void;
};

function signLabel(sign: ZodiacSign | null): { sym: string; name: string } | null {
  if (!sign) return null;
  const z = getZodiacInfo(sign);
  return { sym: z.symbol, name: z.name };
}

export function HomeHeader({
  displayName,
  sunSign,
  moonSign,
  risingSign,
  streakCount = 0,
  streakFreezes = 0,
  streakFreezeAwarded = false,
  streakPreservedByFreeze = false,
  streakSegment = 'new',
  milestoneReached = null,
  shareMilestone = null,
  onShareMilestone,
}: Props): ReactElement {
  const t = useSanctuaryTheme();
  const pulse = useRef(new Animated.Value(0.22)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.38,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.18,
          duration: 2200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const sun = signLabel(sunSign);
  const moon = signLabel(moonSign);
  const rise = signLabel(risingSign);
  const streakLabel = formatStreakRitual(streakCount);
  const freezeLabel = formatFreezeSafeguard(streakFreezes);
  const awardText = freezeAwardCopy(streakFreezeAwarded);
  const celebration = milestoneCelebration(milestoneReached);
  const celebrationText = milestoneCopy(milestoneReached);
  const isLongStreak = streakCount >= 30;
  const isLegendary = streakCount >= 100 || milestoneReached === 100;
  const glowOpacity = pulse.interpolate({
    inputRange: [0.18, 0.38],
    outputRange: [0.18, isLegendary ? 0.56 : isLongStreak ? 0.44 : 0.32],
  });

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Animated.View
        style={[styles.glow, { opacity: pulse, backgroundColor: t.glowLavender }]}
        pointerEvents="none"
      />
      <Text style={[styles.greeting, { color: t.text }]} accessibilityRole="header">
        Hi, {displayName}!
      </Text>
      <Text style={[styles.checkIn, { color: t.textSoft }]}>
        {streakCount > 0 ? segmentCopy(streakSegment, streakCount) : 'Today is ready when you are'}
      </Text>
      {streakLabel ? (
        <View
          style={[
            styles.streakChip,
            {
              borderColor: t.cardBorder,
              backgroundColor: t.card,
              shadowColor: celebration === 'cosmic' ? t.pink : t.lavender,
            },
            isLongStreak ? styles.streakLong : null,
            isLegendary ? styles.streakLegendary : null,
            celebration === 'sparkle' ? styles.streakSparkle : null,
            celebration === 'glow' ? styles.streakGlow : null,
            celebration === 'cosmic' ? styles.streakCosmic : null,
            streakSegment === 'building' ? styles.segmentBuilding : null,
            streakSegment === 'aligned' ? styles.segmentAligned : null,
            streakSegment === 'devoted' ? styles.segmentDevoted : null,
            streakSegment === 'legendary' ? styles.segmentLegendary : null,
          ]}
          accessibilityLabel={`Current ritual streak: ${streakCount} days`}
        >
          <Animated.View
            style={[styles.streakInnerGlow, { opacity: glowOpacity, backgroundColor: t.glowLavender }]}
            pointerEvents="none"
          />
          <View style={[styles.gradientWash, { backgroundColor: t.lavender }]} pointerEvents="none" />
          <View style={[styles.gradientWashAlt, { backgroundColor: t.mint }]} pointerEvents="none" />
          <Text style={[styles.streakText, { color: t.text }]}>{streakLabel}</Text>
          {freezeLabel ? <Text style={[styles.freezeText, { color: t.textMuted }]}>{freezeLabel}</Text> : null}
          {awardText ? <Text style={[styles.milestoneText, { color: t.textSoft }]}>{awardText}</Text> : null}
          {streakPreservedByFreeze ? (
            <Text style={[styles.milestoneText, { color: t.textSoft }]}>Your ritual was protected last night ✨</Text>
          ) : null}
          {celebrationText ? (
            <Text style={[styles.milestoneText, { color: t.textSoft }]}>{celebrationText}</Text>
          ) : null}
          {milestoneReached === 7 ? <Constellation theme={t} /> : null}
          {milestoneReached === 30 || milestoneReached === 50 ? <CosmicBurst theme={t} /> : null}
          {milestoneReached === 100 ? <LegendaryOrbit theme={t} /> : null}
          {shareMilestone && onShareMilestone ? (
            <Pressable
              style={({ pressed }) => [styles.shareButton, { borderColor: t.cardBorder }, pressed && styles.pressed]}
              onPress={onShareMilestone}
              accessibilityRole="button"
              accessibilityLabel="Share streak milestone"
            >
              <Text style={[styles.shareText, { color: t.text }]}>Share this alignment</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={styles.row}>
        <Placement icon={SUN} info={sun} label="Sun" theme={t} />
        <Placement icon={MOON} info={moon} label="Moon" theme={t} />
        <Placement icon={RISING} info={rise} label="Rising" theme={t} />
      </View>
    </View>
  );
}

function Constellation({ theme: t }: { theme: SanctuaryPalette }): ReactElement {
  return (
    <View style={styles.constellation} pointerEvents="none">
      <View style={[styles.star, styles.starA, { backgroundColor: t.paleYellow }]} />
      <View style={[styles.star, styles.starB, { backgroundColor: t.lavender }]} />
      <View style={[styles.star, styles.starC, { backgroundColor: t.mint }]} />
      <View style={[styles.constellationLine, { borderColor: t.lavender }]} />
    </View>
  );
}

function CosmicBurst({ theme: t }: { theme: SanctuaryPalette }): ReactElement {
  return (
    <View style={styles.cosmicBurst} pointerEvents="none">
      <View style={[styles.burstRing, { borderColor: t.pink }]} />
      <View style={[styles.burstCore, { backgroundColor: t.paleYellow }]} />
    </View>
  );
}

function LegendaryOrbit({ theme: t }: { theme: SanctuaryPalette }): ReactElement {
  return (
    <View style={styles.legendaryOrbit} pointerEvents="none">
      <View style={[styles.orbit, { borderColor: t.paleYellow }]} />
      <View style={[styles.orbitDot, { backgroundColor: t.pink }]} />
    </View>
  );
}

function Placement({
  icon,
  info,
  label,
  theme: t,
}: {
  icon: string;
  info: { sym: string; name: string } | null;
  label: string;
  theme: SanctuaryPalette;
}): ReactElement {
  return (
    <View style={styles.placement} accessibilityLabel={`${label} sign ${info?.name ?? 'unknown'}`}>
      <Text style={[styles.planetIcon, { color: t.textMuted }]} allowFontScaling={false}>
        {icon}
      </Text>
      {info ? (
        <>
          <Text style={[styles.zsym, { color: t.lavender }]} allowFontScaling={false}>
            {info.sym}
          </Text>
          <Text style={[styles.zname, { color: t.text, textDecorationColor: t.textDecorationAccent }]}>
            {info.name}
          </Text>
        </>
      ) : (
        <Text style={[styles.placeholder, { color: t.textSoft }]}>—</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    marginHorizontal: -8,
    borderRadius: 28,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  checkIn: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  streakChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: spacing.md,
    alignItems: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  streakInnerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientWash: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 80,
    right: -74,
    top: -80,
    opacity: 0.13,
  },
  gradientWashAlt: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 70,
    left: -68,
    bottom: -78,
    opacity: 0.1,
  },
  streakLong: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  streakLegendary: {
    borderWidth: 2,
  },
  streakSparkle: {
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  streakGlow: {
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  streakCosmic: {
    borderWidth: 1.5,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  segmentBuilding: {
    borderColor: 'rgba(184, 168, 255, 0.42)',
  },
  segmentAligned: {
    borderColor: 'rgba(159, 227, 194, 0.48)',
  },
  segmentDevoted: {
    borderColor: 'rgba(243, 182, 214, 0.55)',
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  segmentLegendary: {
    borderColor: 'rgba(247, 230, 166, 0.72)',
    shadowOpacity: 0.34,
    shadowRadius: 18,
  },
  streakText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  freezeText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  milestoneText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  shareButton: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shareText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  constellation: {
    width: 86,
    height: 24,
    marginTop: 6,
  },
  star: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  starA: { left: 12, top: 12 },
  starB: { left: 42, top: 4 },
  starC: { right: 14, top: 15 },
  constellationLine: {
    position: 'absolute',
    left: 16,
    right: 18,
    top: 13,
    borderTopWidth: 1,
    opacity: 0.45,
    transform: [{ rotate: '-8deg' }],
  },
  cosmicBurst: {
    width: 44,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  burstRing: {
    position: 'absolute',
    width: 38,
    height: 20,
    borderWidth: 1,
    borderRadius: 20,
    opacity: 0.6,
  },
  burstCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendaryOrbit: {
    width: 60,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  orbit: {
    position: 'absolute',
    width: 52,
    height: 22,
    borderRadius: 18,
    borderWidth: 1,
    transform: [{ rotate: '-18deg' }],
    opacity: 0.78,
  },
  orbitDot: {
    position: 'absolute',
    right: 8,
    top: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pressed: { opacity: 0.82 },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: spacing.xl,
    maxWidth: '100%',
  },
  placement: {
    alignItems: 'center',
    minWidth: 88,
    maxWidth: 120,
  },
  planetIcon: {
    fontSize: 14,
    marginBottom: 4,
  },
  zsym: {
    fontSize: 22,
    lineHeight: 26,
  },
  zname: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  placeholder: {
    marginTop: 4,
    fontSize: 16,
  },
});
