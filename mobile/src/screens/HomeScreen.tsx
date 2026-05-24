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
  energyNarrative,
  insightBodyForPeriod,
  moonFromHoroscope,
  stableFill,
  tarotFromHoroscope,
  transitFromHoroscope,
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

      {!sun && !showProfileSpinner ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Complete your profile with a birth chart to unlock daily readings and energy insights.
        </Text>
      ) : null}

      <Animated.View style={[styles.ringsRow, { opacity: opacities[1]! }]}>
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

      <Animated.View style={{ opacity: opacities[2]! }}>
        <EnergyDetailsCard body={energyBody} />
      </Animated.View>

      {sun ? (
        <Animated.View style={{ opacity: opacities[3]! }}>
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

      {sun && initialHoroscopePending ? (
        <LoadingBlock message="Reading the stars…" />
      ) : null}

      {horoscope ? (
        <>
          <Animated.View style={{ opacity: opacities[4]! }}>
            <ModularAstrologyCard
              title="Today's Tarot"
              segmented={false}
              illustration={<Text style={[styles.glyph, { color: theme.lavender }]}>{TAROT_GLYPH}</Text>}
              renderBody={() => `${tarot?.title}. ${tarot?.body}`}
              ctaLabel="Reveal your cosmic card"
              ctaVariant="lavender"
            />
          </Animated.View>
          <Animated.View style={{ opacity: opacities[5]! }}>
            <ModularAstrologyCard
              title="Today's Crystal"
              illustration={
                <View style={styles.illusCol}>
                  <Text style={[styles.glyph, { color: theme.lavender }]}>{CRYSTAL_GLYPH}</Text>
                  <Text style={[styles.crystalTitle, { color: theme.text }]}>{crystal?.title}</Text>
                </View>
              }
              renderBody={(tab) =>
                tab === 'today' ? crystal!.body : insightBodyForPeriod(horoscope, tab)
              }
              ctaLabel="Reveal crystal guidance"
              ctaVariant="white"
            />
          </Animated.View>
          <Animated.View style={{ opacity: opacities[6]! }}>
            <ModularAstrologyCard
              title="Today's Transit"
              illustration={<Text style={[styles.glyph, { color: theme.lavender }]}>{TRANSIT_GLYPH}</Text>}
              renderBody={(tab) =>
                tab === 'today' ? transitFromHoroscope(horoscope).body : insightBodyForPeriod(horoscope, tab)
              }
              ctaLabel="Reveal transit story"
              ctaVariant="lavender"
            />
          </Animated.View>
          <Animated.View style={{ opacity: opacities[7]! }}>
            <ModularAstrologyCard
              title="Today's Moon"
              illustration={
                <View style={styles.illusCol}>
                  <Text style={[styles.glyph, { color: theme.lavender }]}>{MOON_GLYPH}</Text>
                  <Text style={[styles.crystalTitle, { color: theme.text }]}>{moon?.title}</Text>
                </View>
              }
              renderBody={(tab) => insightBodyForPeriod(horoscope, tab)}
              ctaLabel="Reveal moon cycle"
              ctaVariant="white"
            />
          </Animated.View>
          <Animated.View style={{ opacity: opacities[8]! }}>
            <ModularAstrologyCard
              title="Affirmation of the Day"
              segmented={false}
              illustration={<Text style={[styles.glyph, { color: theme.lavender }]}>{AFFIRM_GLYPH}</Text>}
              renderBody={() => affirmation ?? ''}
              ctaLabel="Save this intention"
              ctaVariant="lavender"
            />
          </Animated.View>
        </>
      ) : null}
    </ScreenScroll>
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
