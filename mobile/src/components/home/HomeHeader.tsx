import React, { type ReactElement, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ZodiacSign } from '@astralis/lib/types';
import { getZodiacInfo } from '@astralis/lib/zodiac';
import { useSanctuaryTheme, type SanctuaryPalette } from './sanctuaryTheme';
import { spacing } from '../../theme';
import {
  formatFreezeCapacity,
  freezeAwardCopy,
  keepStreakAliveCopy,
  longestStreakCopy,
  milestoneCelebration,
  milestoneCopy,
  milestoneExperience,
  milestoneProgress,
  nextMilestoneFor,
  segmentCopy,
  type StreakCelebration,
  type StreakMilestone,
  type StreakSegment,
} from '../../lib/streakDisplay';
import { localDateISO } from '../../lib/streaks';

const SUN = '\u2609';
const MOON = '\u263D';
const RISING = '\u2191';

type Props = {
  displayName: string;
  sunSign: ZodiacSign | null;
  moonSign: ZodiacSign | null;
  risingSign: ZodiacSign | null;
  streakCount?: number;
  longestStreakCount?: number;
  streakFreezes?: number;
  streakFreezeCap?: number;
  streakFreezeAwarded?: boolean;
  streakPreservedByFreeze?: boolean;
  streakSegment?: StreakSegment;
  milestoneReached?: StreakMilestone | null;
  nextMilestone?: StreakMilestone | null;
  streakLastDate?: string | null;
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
  longestStreakCount = 0,
  streakFreezes = 0,
  streakFreezeCap = 1,
  streakFreezeAwarded = false,
  streakPreservedByFreeze = false,
  streakSegment = 'new',
  milestoneReached = null,
  nextMilestone = null,
  streakLastDate = null,
  shareMilestone = null,
  onShareMilestone,
}: Props): ReactElement {
  const t = useSanctuaryTheme();
  const pulse = useRef(new Animated.Value(0.18)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.34, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.16, duration: 2400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const sun = signLabel(sunSign);
  const moon = signLabel(moonSign);
  const rise = signLabel(risingSign);
  const resolvedNextMilestone = nextMilestone ?? nextMilestoneFor(streakCount);
  const completedToday = Boolean(streakLastDate && streakLastDate === localDateISO());
  const celebration = milestoneCelebration(milestoneReached);
  const glowOpacity = pulse.interpolate({
    inputRange: [0.16, 0.34],
    outputRange: [0.16, streakCount >= 100 ? 0.54 : streakCount >= 30 ? 0.4 : 0.28],
  });

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Animated.View style={[styles.glow, { opacity: pulse, backgroundColor: t.glowLavender }]} pointerEvents="none" />
      <Text style={[styles.greeting, { color: t.text }]} accessibilityRole="header">
        Hi, {displayName}!
      </Text>
      <Text style={[styles.checkIn, { color: t.textSoft }]}>
        {streakCount > 0 ? segmentCopy(streakSegment, streakCount) : 'Today is ready when you are'}
      </Text>
      <StreakStatusCard
        theme={t}
        streakCount={streakCount}
        longestStreakCount={longestStreakCount}
        freezeCount={streakFreezes}
        freezeCap={streakFreezeCap}
        nextMilestone={resolvedNextMilestone}
        completedToday={completedToday}
        progress={milestoneProgress(streakCount, resolvedNextMilestone)}
        awardText={freezeAwardCopy(streakFreezeAwarded)}
        celebrationText={milestoneCopy(milestoneReached)}
        milestoneTitle={milestoneReached ? milestoneExperience(milestoneReached).title : null}
        streakPreservedByFreeze={streakPreservedByFreeze}
        shareMilestone={shareMilestone}
        onShareMilestone={onShareMilestone}
        glowOpacity={glowOpacity}
        celebration={celebration}
      />
      <View style={styles.row}>
        <Placement icon={SUN} info={sun} label="Sun" theme={t} />
        <Placement icon={MOON} info={moon} label="Moon" theme={t} />
        <Placement icon={RISING} info={rise} label="Rising" theme={t} />
      </View>
    </View>
  );
}

function StreakStatusCard({
  theme: t,
  streakCount,
  longestStreakCount,
  freezeCount,
  freezeCap,
  nextMilestone,
  completedToday,
  progress,
  awardText,
  celebrationText,
  milestoneTitle,
  streakPreservedByFreeze,
  shareMilestone,
  onShareMilestone,
  glowOpacity,
  celebration,
}: {
  theme: SanctuaryPalette;
  streakCount: number;
  longestStreakCount: number;
  freezeCount: number;
  freezeCap: number;
  nextMilestone: StreakMilestone | null;
  completedToday: boolean;
  progress: number;
  awardText: string | null;
  celebrationText: string | null;
  milestoneTitle: string | null;
  streakPreservedByFreeze: boolean;
  shareMilestone: StreakMilestone | null;
  onShareMilestone?: () => void;
  glowOpacity: Animated.AnimatedInterpolation<string | number>;
  celebration: StreakCelebration;
}): ReactElement {
  const progressPercent = `${Math.round(progress * 100)}%` as `${number}%`;
  return (
    <View
      style={[
        styles.streakCard,
        {
          borderColor: t.cardBorder,
          backgroundColor: t.card,
          shadowColor: celebration === 'cosmic' ? t.pink : t.lavender,
        },
      ]}
      accessibilityLabel={`Ritual streak status. Current streak ${streakCount} days. Longest streak ${longestStreakCount} days. ${formatFreezeCapacity(freezeCount, freezeCap)}. ${keepStreakAliveCopy(completedToday, streakCount)}`}
    >
      <Animated.View style={[styles.streakGlow, { opacity: glowOpacity, backgroundColor: t.glowLavender }]} pointerEvents="none" />
      <View style={[styles.gradientWash, { backgroundColor: t.lavender }]} pointerEvents="none" />
      <View style={[styles.gradientWashAlt, { backgroundColor: t.mint }]} pointerEvents="none" />
      <View style={styles.streakTopRow}>
        <View>
          <Text style={[styles.streakEyebrow, { color: t.textMuted }]}>Ritual streak</Text>
          <Text style={[styles.streakNumber, { color: t.text }]}>{streakCount}</Text>
        </View>
        <View style={styles.streakMetricStack}>
          <Metric label="Longest" value={longestStreakCopy(longestStreakCount).replace('Longest rhythm: ', '')} theme={t} />
          <Metric label="Safeguards" value={formatFreezeCapacity(freezeCount, freezeCap)} theme={t} />
        </View>
      </View>
      <Text style={[styles.streakStatus, { color: t.textSoft }]}>
        {keepStreakAliveCopy(completedToday, streakCount)}
      </Text>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressLabel, { color: t.textMuted }]}>Next milestone</Text>
        <Text style={[styles.progressValue, { color: t.text }]}>
          {nextMilestone ? `${nextMilestone} nights` : 'Solar rhythm complete'}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
        <View style={[styles.progressFill, { width: progressPercent, backgroundColor: t.lavender }]} />
      </View>
      {milestoneTitle ? <Text style={[styles.milestoneTitle, { color: t.text }]}>{milestoneTitle}</Text> : null}
      {awardText ? <Text style={[styles.milestoneText, { color: t.textSoft }]}>{awardText}</Text> : null}
      {streakPreservedByFreeze ? (
        <Text style={[styles.milestoneText, { color: t.textSoft }]}>A safeguard protected your rhythm.</Text>
      ) : null}
      {celebrationText ? <Text style={[styles.milestoneText, { color: t.textSoft }]}>{celebrationText}</Text> : null}
      {shareMilestone === 7 ? <Constellation theme={t} /> : null}
      {shareMilestone === 30 || shareMilestone === 50 ? <CosmicBurst theme={t} /> : null}
      {shareMilestone === 100 || shareMilestone === 365 ? <LegendaryOrbit theme={t} /> : null}
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
  );
}

function Metric({ label, value, theme: t }: { label: string; value: string; theme: SanctuaryPalette }): ReactElement {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: t.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: t.text }]}>{value}</Text>
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
        <Text style={[styles.placeholder, { color: t.textSoft }]}>-</Text>
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
  streakCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  streakGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientWash: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 90,
    right: -80,
    top: -90,
    opacity: 0.13,
  },
  gradientWashAlt: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 70,
    left: -72,
    bottom: -82,
    opacity: 0.1,
  },
  streakTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  streakEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  streakNumber: {
    fontSize: 56,
    lineHeight: 62,
    fontWeight: '900',
  },
  streakMetricStack: {
    flex: 1,
    gap: spacing.xs,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  metric: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  streakStatus: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  progressLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  progressValue: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  milestoneTitle: {
    marginTop: spacing.md,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  milestoneText: {
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  shareButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'flex-start',
  },
  shareText: {
    fontSize: 12,
    fontWeight: '900',
  },
  constellation: {
    width: 86,
    height: 24,
    marginTop: spacing.sm,
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
    marginTop: spacing.sm,
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
    marginTop: spacing.sm,
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
