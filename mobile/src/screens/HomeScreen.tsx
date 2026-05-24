import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EnergyDetailsCard } from '../components/home/EnergyDetailsCard';
import { EnergyRing } from '../components/home/EnergyRing';
import { HomeHeader } from '../components/home/HomeHeader';
import { HoroscopePremiumCard } from '../components/home/HoroscopePremiumCard';
import { ModularAstrologyCard } from '../components/home/ModularAstrologyCard';
import type { HoroscopePeriod } from '../components/home/homeDateUtils';
import { horoscopeDateForPeriod } from '../components/home/homeDateUtils';
import {
  affirmationFromHoroscope,
  crystalFromHoroscope,
  currentSkySummary,
  energyNarrative,
  insightBodyForPeriod,
  moonFromHoroscope,
  stableFill,
  tarotFromHoroscope,
  transitFromHoroscope,
  strongestTransitCopy,
  whyThisReadingCopy,
} from '../components/home/homeContentUtils';
import { useSanctuaryTheme } from '../components/home/sanctuaryTheme';
import { LoadingBlock } from '../components/LoadingBlock';
import { ScreenScroll } from '../components/ScreenScroll';
import { useAuth } from '../hooks/useAuth';
import { useHoroscope } from '../hooks/useHoroscope';
import { useProfile } from '../hooks/useProfile';
import { loadDailyStreak, localDateISO, type DailyStreak } from '../lib/streaks';
import { consumeMilestoneCelebration } from '../lib/streakCelebration';
import { normalizeStreakCount, normalizeStreakSegment, type StreakMilestone } from '../lib/streakDisplay';
import { shareStreakMilestoneCard } from '../lib/streakShare';
import { track, trackDailyActiveOnce } from '../lib/analytics';
import { BRAND_COPY } from '../lib/brandCopy';
import { goToPremium } from '../navigation/navigationRef';
import { spacing } from '../theme';

const TAROT_GLYPH = '\u2728';
const CRYSTAL_GLYPH = '\u2726';
const TRANSIT_GLYPH = '\u2644';
const MOON_GLYPH = '\u263D';
const AFFIRM_GLYPH = '\u2600';

export function HomeScreen(): ReactElement {
  const theme = useSanctuaryTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, load: loadProfile, loading: profileLoading, error: profileError } = useProfile();
  const { horoscope, load, loadMine, loading: horoLoading, error: horoError } = useHoroscope();
  const [horoscopePeriod, setHoroscopePeriod] = useState<HoroscopePeriod>('today');
  const [activeEnergy, setActiveEnergy] = useState<'love' | 'opportunity' | 'stress'>('opportunity');
  const [dailyStreak, setDailyStreak] = useState<DailyStreak>({ count: 0, lastCheckInDate: null });
  const [visibleMilestone, setVisibleMilestone] = useState<StreakMilestone | null>(null);

  const opacities = useMemo(() => Array.from({ length: 9 }, () => new Animated.Value(0)), []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const sun = profile?.natalChart?.sunSign ?? null;
  // Premium flag is sourced from auth session (kept fresh by billing refresh flow).
  // Fall back to profile payload when auth user is not ready yet.
  const isPremium = Boolean(user?.isPremium ?? profile?.user?.isPremium);
  const effectiveHoroscopePeriod: HoroscopePeriod = isPremium ? horoscopePeriod : 'today';
  const dateISO = horoscopeDateForPeriod(effectiveHoroscopePeriod);

  useEffect(() => {
    void loadDailyStreak().then(setDailyStreak);
  }, []);

  useEffect(() => {
    void trackDailyActiveOnce({
      date: localDateISO(),
      hasBirthProfile: Boolean(profile?.birthProfile && profile.natalChart),
      isPremium,
    });
  }, [isPremium, profile?.birthProfile, profile?.natalChart]);

  useEffect(() => {
    if (!sun) return;
    if (effectiveHoroscopePeriod === 'today') {
      void loadMine();
      return;
    }
    void load(sun, dateISO);
  }, [sun, dateISO, effectiveHoroscopePeriod, load, loadMine]);

  useEffect(() => {
    if (!horoscope || horoLoading) return;
    void track('horoscope_viewed', { source: 'home', period: effectiveHoroscopePeriod, isPremium });
  }, [effectiveHoroscopePeriod, horoLoading, horoscope, isPremium]);

  useEffect(() => {
    if (!horoscope?.isNewStreakDay) return;
    if (horoscope.streakPreservedByFreeze) {
      void track('streak_freeze_used', {
        streakCount: horoscope.streakCount ?? 0,
        freezesRemaining: horoscope.streakFreezes ?? 0,
      });
      return;
    }
    if (horoscope.milestoneReached) {
      void track('streak_milestone', {
        streakCount: horoscope.streakCount ?? horoscope.milestoneReached,
        milestone: horoscope.milestoneReached,
      });
      return;
    }
    if (horoscope.streakCount === 1) {
      void track('streak_started', { streakCount: 1 });
    }
  }, [
    horoscope?.isNewStreakDay,
    horoscope?.milestoneReached,
    horoscope?.streakCount,
    horoscope?.streakFreezes,
    horoscope?.streakPreservedByFreeze,
  ]);

  useEffect(() => {
    let mounted = true;
    void consumeMilestoneCelebration(
      horoscope?.milestoneReached as StreakMilestone | null | undefined,
      horoscope?.streakLastDate,
    ).then((milestone) => {
      if (mounted) setVisibleMilestone(milestone);
    });
    return () => {
      mounted = false;
    };
  }, [horoscope?.milestoneReached, horoscope?.streakLastDate]);

  useEffect(() => {
    if (profileLoading) return;
    const anims = opacities.map((o) =>
      Animated.timing(o, { toValue: 1, duration: 420, useNativeDriver: true }),
    );
    Animated.stagger(65, anims).start();
  }, [profileLoading, opacities]);

  const displayName = useMemo(() => {
    const u = profile?.user;
    if (!u) return 'stargazer';
    const n = (u.displayName ?? u.fullName).trim();
    return n || 'stargazer';
  }, [profile?.user]);

  const moonSign = profile?.natalChart?.moonSign ?? null;
  const risingSign = profile?.natalChart?.risingSign ?? null;

  const loveP = horoscope ? stableFill(horoscope.love, 0.48, 0.9) : 0.58;
  const oppP = horoscope ? stableFill(horoscope.career, 0.52, 0.94) : 0.66;
  const stressP = horoscope ? stableFill(horoscope.health, 0.35, 0.78) : 0.44;

  const initialHoroscopePending = Boolean(sun && horoLoading && !horoscope);
  const showProfileSpinner = profileLoading;

  const energyBody = horoscope
    ? energyNarrative(horoscope)
    : 'Align your birth details to unlock personalized energy insights woven from your chart and today’s sky.';

  const tarot = horoscope ? tarotFromHoroscope(horoscope) : null;
  const crystal = horoscope ? crystalFromHoroscope(horoscope) : null;
  const transit = horoscope ? transitFromHoroscope(horoscope) : null;
  const moon = horoscope ? moonFromHoroscope(horoscope, moonSign) : null;
  const affirmation = horoscope ? affirmationFromHoroscope(horoscope) : null;
  const streakCount = normalizeStreakCount(horoscope?.streakCount, dailyStreak.count);
  const streakSegment = normalizeStreakSegment(horoscope?.streakSegment, streakCount);
  const shareMilestone = (horoscope?.milestoneReached ?? visibleMilestone) as StreakMilestone | null;

  const onShareMilestone = (): void => {
    if (!shareMilestone) return;
    void shareStreakMilestoneCard({
      milestone: shareMilestone,
      zodiacSign: sun,
      displayName,
    });
  };

  const onHoroscopePeriodChange = (next: HoroscopePeriod): void => {
    setHoroscopePeriod(next);
    if (!isPremium && next !== 'today') {
      void track('locked_content_tapped', { surface: 'horoscope_period', period: next });
      void track('paywall_viewed', { source: 'locked_preview' });
      goToPremium('locked_preview');
    }
  };

  return (
    <ScreenScroll
      scrollBackgroundColor={theme.bgDeep}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
      }}
    >
      <View style={styles.bgDecor} pointerEvents="none">
        <View style={[styles.orb, styles.orbA, { backgroundColor: theme.bgMid }]} />
        <View style={[styles.orb, styles.orbB, { backgroundColor: theme.lavender }]} />
      </View>

      {showProfileSpinner ? <LoadingBlock message="Gathering your cosmos…" /> : null}
      {profileError ? (
        <Text style={styles.alert} accessibilityRole="alert">
          {profileError}
        </Text>
      ) : null}

      <Animated.View style={{ opacity: opacities[0]! }}>
        <HomeHeader
          displayName={displayName}
          sunSign={sun}
          moonSign={moonSign}
          risingSign={risingSign}
          streakCount={streakCount}
          streakFreezes={horoscope?.streakFreezes ?? 0}
          streakFreezeAwarded={Boolean(horoscope?.streakFreezeAwarded)}
          streakPreservedByFreeze={Boolean(horoscope?.streakPreservedByFreeze)}
          streakSegment={streakSegment}
          milestoneReached={visibleMilestone}
          shareMilestone={shareMilestone}
          onShareMilestone={shareMilestone ? onShareMilestone : undefined}
        />
      </Animated.View>

      {profile?.natalChart ? (
        <Animated.View style={{ opacity: opacities[1]! }}>
          <SkyAnchorCard
            sun={profile.natalChart.sunInfo.name}
            moon={profile.natalChart.moonInfo.name}
            rising={profile.natalChart.risingInfo?.name ?? null}
            birthCity={profile.birthProfile?.birthCity ?? null}
            date={horoscope?.date ?? dateISO}
          />
        </Animated.View>
      ) : null}

      {horoscope?.skyContext ? (
        <Animated.View style={{ opacity: opacities[1]! }}>
          <TodaySkyCard horoscope={horoscope} />
        </Animated.View>
      ) : null}

      {!sun && !showProfileSpinner ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Complete your profile with a birth chart to unlock daily readings and energy insights.
        </Text>
      ) : null}

      <Animated.View style={[styles.ringsRow, { opacity: opacities[2]! }]}>
        <EnergyRing
          size={86}
          stroke={9}
          color={theme.pink}
          glow={theme.pink}
          progress={loveP}
          centerIcon={'\u2665'}
          energyLabel="Blaze"
          sectionTitle="Love"
          active={activeEnergy === 'love'}
          onPress={() => setActiveEnergy('love')}
        />
        <View style={styles.ringCenterWrap}>
          <EnergyRing
            size={102}
            stroke={10}
            color={theme.mint}
            glow={theme.mint}
            progress={oppP}
            centerIcon={'\u2726'}
            energyLabel="Bloom"
            sectionTitle="Opportunity"
            active={activeEnergy === 'opportunity'}
            onPress={() => setActiveEnergy('opportunity')}
          />
        </View>
        <EnergyRing
          size={86}
          stroke={9}
          color={theme.paleYellow}
          glow={theme.paleYellow}
          progress={stressP}
          centerIcon={'\u26A1'}
          energyLabel="Breeze"
          sectionTitle="Stress"
          active={activeEnergy === 'stress'}
          onPress={() => setActiveEnergy('stress')}
        />
      </Animated.View>

      <Animated.View style={{ opacity: opacities[3]! }}>
        <EnergyDetailsCard body={energyBody} />
      </Animated.View>

      {sun ? (
        <Animated.View style={{ opacity: opacities[4]! }}>
          <HoroscopePremiumCard
            horoscope={horoscope}
            period={horoscopePeriod}
            onPeriodChange={onHoroscopePeriodChange}
            isPremium={isPremium}
            loading={Boolean(horoLoading)}
            error={horoError}
            onLearnMore={() => {
              void track('paywall_viewed', { source: 'post_reading' });
              goToPremium('post_reading');
            }}
          />
        </Animated.View>
      ) : null}

      {horoscope ? (
        <Animated.View style={{ opacity: opacities[4]! }}>
          <WhyThisReadingCard horoscope={horoscope} />
        </Animated.View>
      ) : null}

      {sun && initialHoroscopePending ? (
        <LoadingBlock message="Reading the stars…" />
      ) : null}

      {horoscope ? (
        <>
          <Animated.View style={{ opacity: opacities[5]! }}>
            <ModularAstrologyCard
              title="Symbolic Card"
              segmented={false}
              illustration={<Text style={[styles.glyph, { color: theme.lavender }]}>{TAROT_GLYPH}</Text>}
              renderBody={() => `${tarot?.title}. ${tarot?.body}`}
              ctaLabel="Open symbolic layer"
              ctaVariant="lavender"
            />
          </Animated.View>
          <Animated.View style={{ opacity: opacities[6]! }}>
            <ModularAstrologyCard
              title="Color & Focus"
              illustration={
                <View style={styles.illusCol}>
                  <Text style={[styles.glyph, { color: theme.lavender }]}>{CRYSTAL_GLYPH}</Text>
                  <Text style={[styles.crystalTitle, { color: theme.text }]}>{crystal?.title}</Text>
                </View>
              }
              renderBody={(tab) =>
                tab === 'today' ? crystal!.body : insightBodyForPeriod(horoscope, tab)
              }
              ctaLabel="Open focus note"
              ctaVariant="white"
            />
          </Animated.View>
          <Animated.View style={{ opacity: opacities[7]! }}>
            <ModularAstrologyCard
              title="Why Today Feels This Way"
              illustration={<Text style={[styles.glyph, { color: theme.lavender }]}>{TRANSIT_GLYPH}</Text>}
              renderBody={(tab) =>
                tab === 'today' ? transitFromHoroscope(horoscope).body : insightBodyForPeriod(horoscope, tab)
              }
              ctaLabel="Open sky context"
              ctaVariant="lavender"
            />
          </Animated.View>
          <Animated.View style={{ opacity: opacities[8]! }}>
            <ModularAstrologyCard
              title="Moon Rhythm"
              illustration={
                <View style={styles.illusCol}>
                  <Text style={[styles.glyph, { color: theme.lavender }]}>{MOON_GLYPH}</Text>
                  <Text style={[styles.crystalTitle, { color: theme.text }]}>{moon?.title}</Text>
                </View>
              }
              renderBody={(tab) => insightBodyForPeriod(horoscope, tab)}
              ctaLabel="Open moon rhythm"
              ctaVariant="white"
            />
          </Animated.View>
          <Animated.View style={{ opacity: opacities[8]! }}>
            <ModularAstrologyCard
              title="Daily Intention"
              segmented={false}
              illustration={<Text style={[styles.glyph, { color: theme.lavender }]}>{AFFIRM_GLYPH}</Text>}
              renderBody={() => affirmation ?? ''}
              ctaLabel="Save intention"
              ctaVariant="lavender"
            />
          </Animated.View>
        </>
      ) : null}
    </ScreenScroll>
  );
}

function TodaySkyCard({ horoscope }: { horoscope: NonNullable<ReturnType<typeof useHoroscope>['horoscope']> }): ReactElement {
  const items = currentSkySummary(horoscope);
  return (
    <View style={styles.todaySky}>
      <Text style={styles.todaySkyEyebrow}>Today's sky</Text>
      <View style={styles.todaySkyGrid}>
        {items.map((item) => (
          <View key={item.label} style={styles.todaySkyItem}>
            <Text style={styles.todaySkyLabel}>{item.label}</Text>
            <Text style={styles.todaySkyValue}>{item.value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.todaySkyTransit}>{strongestTransitCopy(horoscope)}</Text>
    </View>
  );
}

function WhyThisReadingCard({ horoscope }: { horoscope: NonNullable<ReturnType<typeof useHoroscope>['horoscope']> }): ReactElement {
  return (
    <View style={styles.whyReading}>
      <Text style={styles.whyReadingTitle}>Why this reading?</Text>
      <Text style={styles.whyReadingBody}>{whyThisReadingCopy(horoscope)}</Text>
    </View>
  );
}

function SkyAnchorCard({
  sun,
  moon,
  rising,
  birthCity,
  date,
}: {
  sun: string;
  moon: string;
  rising: string | null;
  birthCity: string | null;
  date: string;
}): ReactElement {
  return (
    <View style={styles.skyAnchor}>
      <Text style={styles.skyAnchorEyebrow}>{BRAND_COPY.skyMapping}</Text>
      <Text style={styles.skyAnchorTitle}>Today's sky is read through your birth chart.</Text>
      <Text style={styles.skyAnchorBody}>
        Astralis maps this reading to calculated placements: Sun in {sun}, Moon in {moon}
        {rising ? `, rising ${rising}` : ''}. {birthCity ? `Your chart is anchored to ${birthCity}. ` : ''}
        Sky date: {date}.
      </Text>
      <Text style={styles.skyAnchorMeta}>{BRAND_COPY.steppeLine}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bgDecor: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    height: 420,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.35,
  },
  orbA: {
    width: 280,
    height: 280,
    top: -80,
    right: -100,
  },
  orbB: {
    width: 220,
    height: 220,
    top: 120,
    left: -120,
    opacity: 0.12,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
    maxWidth: '100%',
  },
  skyAnchor: {
    borderWidth: 1,
    borderColor: 'rgba(184, 168, 255, 0.28)',
    borderRadius: 18,
    backgroundColor: 'rgba(16, 17, 37, 0.76)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  skyAnchorEyebrow: {
    color: '#f4d98b',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  skyAnchorTitle: {
    color: '#f5f3ff',
    marginTop: 4,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  skyAnchorBody: {
    color: '#c9c7df',
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  skyAnchorMeta: {
    color: '#a7e4c4',
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  todaySky: {
    borderWidth: 1,
    borderColor: 'rgba(167, 228, 196, 0.24)',
    borderRadius: 18,
    backgroundColor: 'rgba(8, 22, 34, 0.72)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  todaySkyEyebrow: {
    color: '#a7e4c4',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  todaySkyGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  todaySkyItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(216, 221, 255, 0.16)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  todaySkyLabel: {
    color: '#b9bddc',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todaySkyValue: {
    color: '#f5f3ff',
    marginTop: 3,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  todaySkyTransit: {
    color: '#d8d7ea',
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  whyReading: {
    borderWidth: 1,
    borderColor: 'rgba(244, 217, 139, 0.22)',
    borderRadius: 18,
    backgroundColor: 'rgba(24, 20, 43, 0.72)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  whyReadingTitle: {
    color: '#f4d98b',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  whyReadingBody: {
    color: '#d8d7ea',
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  ringCenterWrap: {
    transform: [{ translateY: -6 }],
  },
  glyph: {
    fontSize: 40,
  },
  illusCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  crystalTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
    maxWidth: 88,
  },
  hint: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  alert: {
    color: '#ff9b9b',
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontSize: 14,
  },
});
