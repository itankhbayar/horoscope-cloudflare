import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EnergyDetailsCard } from '../components/home/EnergyDetailsCard';
import { EnergyRing } from '../components/home/EnergyRing';
import { HomeHeader } from '../components/home/HomeHeader';
import { HoroscopePremiumCard } from '../components/home/HoroscopePremiumCard';
import { ModularAstrologyCard } from '../components/home/ModularAstrologyCard';
import { RitualMoment } from '../components/home/RitualMoment';
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
import { shareDailyHoroscopeCard } from '../lib/horoscopeShareCard';
import { track, trackDailyActiveOnce, trackRitualEvent } from '../lib/analytics';
import { BRAND_COPY } from '../lib/brandCopy';
import { shouldCompressExplanations } from '../lib/emotionalScreenHierarchy';
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
  const [openMoment, setOpenMoment] = useState<'resonance' | 'reflection' | 'deeper' | 'closed' | null>(null);
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
    : 'Add birth details when you want tonight mapped more personally.';

  const tarot = horoscope ? tarotFromHoroscope(horoscope) : null;
  const crystal = horoscope ? crystalFromHoroscope(horoscope) : null;
  const transit = horoscope ? transitFromHoroscope(horoscope) : null;
  const moon = horoscope ? moonFromHoroscope(horoscope, moonSign) : null;
  const affirmation = horoscope ? affirmationFromHoroscope(horoscope) : null;
  const streakCount = normalizeStreakCount(horoscope?.streakCount, dailyStreak.count);
  const streakSegment = normalizeStreakSegment(horoscope?.streakSegment, streakCount);
  const shareMilestone = (horoscope?.milestoneReached ?? visibleMilestone) as StreakMilestone | null;
  const dominantSignal = useMemo(() => {
    if (!horoscope) return 'arrival';
    const options: Array<[string, number]> = [
      ['love', loveP],
      ['opportunity', oppP],
      ['stress', stressP],
    ];
    return options.sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'opportunity';
  }, [horoscope, loveP, oppP, stressP]);
  const compressHome = shouldCompressExplanations({
    returningUser: streakCount >= 3,
    ambientMode: false,
    reducedMotion: false,
    ritualNights: streakCount,
  });

  useEffect(() => {
    void track('home_sequence_started', { dominantSignal });
    return () => {
      if (!openMoment || openMoment !== 'closed') {
        void track('home_sequence_dropoff', { moment: openMoment ?? 'arrival' });
      }
    };
  }, [dominantSignal, openMoment]);

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
      void trackRitualEvent('deeper_layer_tapped', {
        source: 'home',
        momentType: 'premium_continuation',
        premiumState: 'free',
        trigger: 'period_tab',
        readingType: next,
        continuationType: 'period_depth',
        userMode: user ? 'authenticated' : 'unknown',
      });
      goToPremium('locked_preview');
    }
  };

  const onShareTodayReading = (): void => {
    if (!horoscope) return;
    void shareDailyHoroscopeCard(horoscope);
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

      <Animated.View style={{ opacity: opacities[1]! }}>
        <NightlyArrivalMoment
          horoscope={horoscope}
          date={horoscope?.date ?? dateISO}
          dominantSignal={dominantSignal}
          compact={compressHome}
        />
      </Animated.View>

      {!sun && !showProfileSpinner ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Add a birth chart when you want tonight mapped more personally.
        </Text>
      ) : null}

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
              void trackRitualEvent('premium_continuation_viewed', {
                source: 'home',
                momentType: 'main_sky_reading',
                premiumState: isPremium ? 'premium' : 'free',
                trigger: 'learn_more',
                readingType: effectiveHoroscopePeriod,
                continuationType: 'private_ritual',
                userMode: user ? 'authenticated' : 'unknown',
              });
              goToPremium('post_reading');
            }}
          />
          {horoscope && effectiveHoroscopePeriod === 'today' ? (
            <Pressable
              style={({ pressed }) => [styles.dailyShareButton, pressed && styles.pressed]}
              onPress={onShareTodayReading}
              accessibilityRole="button"
              accessibilityLabel="Share today's reading"
            >
              <Text style={styles.dailyShareIcon}>{'\u2197'}</Text>
              <Text style={styles.dailyShareText}>Share today's reading</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {horoscope && openMoment === 'reflection' ? (
        <Animated.View style={{ opacity: opacities[4]! }}>
          <WhyThisReadingCard horoscope={horoscope} compact={compressHome} />
        </Animated.View>
      ) : null}

      {sun && initialHoroscopePending ? (
        <LoadingBlock message="Reading the stars…" />
      ) : null}

      {horoscope ? (
        <>
          {openMoment === 'reflection' ? <Animated.View style={{ opacity: opacities[5]! }}>
            <ModularAstrologyCard
              title="Symbolic Card"
              segmented={false}
              illustration={<Text style={[styles.glyph, { color: theme.lavender }]}>{TAROT_GLYPH}</Text>}
              renderBody={() => `${tarot?.title}. ${tarot?.body}`}
              ctaLabel="Open symbolic layer"
              ctaVariant="lavender"
            />
          </Animated.View> : null}
          {openMoment === 'resonance' ? <Animated.View style={{ opacity: opacities[6]! }}>
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
          </Animated.View> : null}
          {openMoment === 'deeper' && isPremium ? <Animated.View style={{ opacity: opacities[7]! }}>
            <ModularAstrologyCard
              title="Why Today Feels This Way"
              illustration={<Text style={[styles.glyph, { color: theme.lavender }]}>{TRANSIT_GLYPH}</Text>}
              renderBody={(tab) =>
                tab === 'today' ? transitFromHoroscope(horoscope).body : insightBodyForPeriod(horoscope, tab)
              }
              ctaLabel="Open sky context"
              ctaVariant="lavender"
            />
          </Animated.View> : null}
          {openMoment === 'deeper' && isPremium ? <Animated.View style={{ opacity: opacities[8]! }}>
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
          </Animated.View> : null}
          {openMoment === 'reflection' ? <Animated.View style={{ opacity: opacities[8]! }}>
            <ModularAstrologyCard
              title="Daily Intention"
              segmented={false}
              illustration={<Text style={[styles.glyph, { color: theme.lavender }]}>{AFFIRM_GLYPH}</Text>}
              renderBody={() => affirmation ?? ''}
              ctaLabel="Save intention"
              ctaVariant="lavender"
            />
          </Animated.View> : null}
          {openMoment === 'deeper' && !isPremium ? (
            <PremiumContinuationMoment
              onPress={() => {
                void trackRitualEvent('premium_continuation_tapped', {
                  source: 'home',
                  moment: 'premium_continuity',
                  momentType: 'premium_continuity',
                  premiumState: 'free',
                  trigger: 'deeper_moment',
                  readingType: effectiveHoroscopePeriod,
                  continuationType: 'private_ritual',
                  userMode: user ? 'authenticated' : 'unknown',
                });
                goToPremium('post_reading');
              }}
            />
          ) : null}
          <HomeSequenceControls
            openMoment={openMoment}
            isPremium={isPremium}
            onOpen={(moment) => {
              setOpenMoment(moment);
              if (moment === 'reflection') {
                void trackRitualEvent('expanded_reading_requested', {
                  source: 'home',
                  moment,
                  momentType: 'reflection',
                  premiumState: isPremium ? 'premium' : 'free',
                  trigger: 'sequence_control',
                  readingType: 'affirmation',
                  continuationType: 'reflection',
                  userMode: user ? 'authenticated' : 'unknown',
                });
              }
              void trackRitualEvent('ritual_moment_continued', {
                source: 'home',
                moment,
                momentType: moment,
                premiumState: isPremium ? 'premium' : 'free',
                trigger: 'sequence_control',
                readingType: effectiveHoroscopePeriod,
                continuationType: moment,
                userMode: user ? 'authenticated' : 'unknown',
              });
              void track('atmosphere_first_navigation_success', { from: 'home', to: moment, moment });
            }}
            onClose={() => {
              setOpenMoment('closed');
              void track('home_sequence_completed', { finalMoment: 'quiet_close' });
            }}
          />
        </>
      ) : null}
    </ScreenScroll>
  );
}

// Home is intentionally a sequence of ritual moments. Keep new surfaces staged behind
// explicit continuations instead of returning to a stacked content dashboard.
function NightlyArrivalMoment({
  horoscope,
  date,
  dominantSignal,
  compact,
}: {
  horoscope: NonNullable<ReturnType<typeof useHoroscope>['horoscope']> | null;
  date: string;
  dominantSignal: string;
  compact: boolean;
}): ReactElement {
  const signal = dominantSignal === 'stress' ? 'sensitivity' : dominantSignal;
  return (
    <View style={styles.nightlyArrival}>
      <Text style={styles.nightlyEyebrow}>Tonight's sequence</Text>
      <Text style={styles.nightlyTitle}>
        {horoscope?.overall ? clampHomeLine(horoscope.overall) : 'Arrive slowly. Let the sky come into focus.'}
      </Text>
      {!compact ? (
        <Text style={styles.nightlyBody}>
          One reading, one resonance, one quiet continuation. The strongest signal tonight is {signal}.
        </Text>
      ) : null}
      <Text style={styles.nightlyMeta}>{date}</Text>
    </View>
  );
}

function HomeSequenceControls({
  openMoment,
  isPremium,
  onOpen,
  onClose,
}: {
  openMoment: 'resonance' | 'reflection' | 'deeper' | 'closed' | null;
  isPremium: boolean;
  onOpen: (moment: 'resonance' | 'reflection' | 'deeper') => void;
  onClose: () => void;
}): ReactElement {
  if (openMoment === 'closed') {
    return (
      <View style={styles.quietClose}>
        <Text style={styles.quietCloseTitle}>Enough for tonight.</Text>
        <Text style={styles.quietCloseBody}>The ritual can stay small and still count.</Text>
      </View>
    );
  }
  return (
    <View style={styles.sequenceControls}>
      <SequenceButton
        label={openMoment === 'resonance' ? 'Resonance is open' : 'Feel personal resonance'}
        disabled={openMoment === 'resonance'}
        onPress={() => onOpen('resonance')}
      />
      <SequenceButton
        label={openMoment === 'reflection' ? 'Reflection is open' : 'Continue reflection'}
        disabled={openMoment === 'reflection'}
        onPress={() => onOpen('reflection')}
      />
      <SequenceButton
        label={isPremium ? 'Open deeper sky' : 'Continue deeper'}
        disabled={openMoment === 'deeper'}
        onPress={() => onOpen('deeper')}
      />
      <Pressable
        style={({ pressed }) => [styles.closeSequenceButton, pressed && styles.pressed]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close tonight's ritual"
      >
        <Text style={styles.closeSequenceText}>Close softly</Text>
      </Pressable>
    </View>
  );
}

function SequenceButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      style={({ pressed }) => [styles.sequenceButton, disabled && styles.sequenceButtonActive, pressed && !disabled && styles.pressed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      accessibilityLabel={label}
    >
      <Text style={styles.sequenceButtonText}>{label}</Text>
    </Pressable>
  );
}

function EnergySequenceMoment({
  activeEnergy,
  setActiveEnergy,
  body,
  loveP,
  oppP,
  stressP,
}: {
  activeEnergy: 'love' | 'opportunity' | 'stress';
  setActiveEnergy: (value: 'love' | 'opportunity' | 'stress') => void;
  body: string;
  loveP: number;
  oppP: number;
  stressP: number;
}): ReactElement {
  void setActiveEnergy;
  void loveP;
  void oppP;
  void stressP;
  const theme = useSanctuaryTheme();
  const label = activeEnergy === 'love' ? 'relationship tone' : activeEnergy === 'stress' ? 'sensitivity tone' : 'opportunity tone';
  return (
    <RitualMoment
      moment="resonance"
      title={`Personal resonance: ${label}`}
      primaryLine={clampHomeLine(body)}
      detail="Choose one tone if you want to feel where tonight lands most clearly."
      defaultExpanded
      symbol={<Text style={[styles.glyph, { color: theme.lavender }]}>{CRYSTAL_GLYPH}</Text>}
    />
  );
}

function PremiumContinuationMoment({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <View style={styles.premiumContinuation}>
      <Text style={styles.premiumContinuationTitle}>Continue deeper into tonight's rhythm.</Text>
      <Text style={styles.premiumContinuationBody}>
        Premium extends the ritual into private continuity, not more noise.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.premiumContinuationButton, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Continue deeper with Premium"
      >
        <Text style={styles.premiumContinuationButtonText}>Open private continuation</Text>
      </Pressable>
    </View>
  );
}

function clampHomeLine(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= 120) return clean;
  return `${clean.slice(0, 117).trim()}...`;
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

function WhyThisReadingCard({
  horoscope,
  compact,
}: {
  horoscope: NonNullable<ReturnType<typeof useHoroscope>['horoscope']>;
  compact?: boolean;
}): ReactElement {
  return (
    <View style={styles.whyReading}>
      <Text style={styles.whyReadingTitle}>Why this reading?</Text>
      <Text style={styles.whyReadingBody}>
        {compact ? strongestTransitCopy(horoscope) : whyThisReadingCopy(horoscope)}
      </Text>
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
  nightlyArrival: {
    borderWidth: 1,
    borderColor: 'rgba(184, 168, 255, 0.26)',
    borderRadius: 24,
    backgroundColor: 'rgba(16, 17, 37, 0.78)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  nightlyEyebrow: {
    color: '#f4d98b',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  nightlyTitle: {
    color: '#f5f3ff',
    marginTop: spacing.sm,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
  },
  nightlyBody: {
    color: '#c9c7df',
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  nightlyMeta: {
    color: '#a7e4c4',
    marginTop: spacing.md,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
    textTransform: 'uppercase',
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
  dailyShareButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(244, 217, 139, 0.34)',
    backgroundColor: 'rgba(184, 168, 255, 0.14)',
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dailyShareIcon: {
    color: '#f4d98b',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  dailyShareText: {
    color: '#f5f3ff',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  sequenceControls: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sequenceButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(216, 221, 255, 0.18)',
    backgroundColor: 'rgba(16, 17, 37, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  sequenceButtonActive: {
    borderColor: 'rgba(244, 217, 139, 0.46)',
    backgroundColor: 'rgba(244, 217, 139, 0.12)',
  },
  sequenceButtonText: {
    color: '#f5f3ff',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  closeSequenceButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSequenceText: {
    color: '#c9c7df',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  quietClose: {
    borderWidth: 1,
    borderColor: 'rgba(167, 228, 196, 0.2)',
    borderRadius: 20,
    backgroundColor: 'rgba(8, 22, 34, 0.62)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  quietCloseTitle: {
    color: '#f5f3ff',
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
  },
  quietCloseBody: {
    color: '#c9c7df',
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  premiumContinuation: {
    borderWidth: 1,
    borderColor: 'rgba(244, 217, 139, 0.26)',
    borderRadius: 22,
    backgroundColor: 'rgba(24, 20, 43, 0.74)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  premiumContinuationTitle: {
    color: '#f5f3ff',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  premiumContinuationBody: {
    color: '#d8d7ea',
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  premiumContinuationButton: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: '#f4d98b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  premiumContinuationButtonText: {
    color: '#18122d',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
