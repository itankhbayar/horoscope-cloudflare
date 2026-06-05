import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EnergyDetailsCard } from '../components/home/EnergyDetailsCard';
import { EnergyRing } from '../components/home/EnergyRing';
import { HomeHeader } from '../components/home/HomeHeader';
import { HoroscopePremiumCard } from '../components/home/HoroscopePremiumCard';
import { PatternMemoryCard } from '../components/home/PatternMemoryCard';
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
import { useReflection } from '../hooks/useReflection';
import { useProfile } from '../hooks/useProfile';
import { EveningCheckInCard, ReflectionAckCard } from '../components/home/ReflectionCards';
import { loadDailyReadingReveal, saveDailyReadingReveal } from '../lib/dailyReadingReveal';
import { loadDailyStreak, localDateISO, saveDailyStreak, type DailyStreak } from '../lib/streaks';
import { consumeDailyRitualCelebration, consumeMilestoneCelebration } from '../lib/streakCelebration';
import { milestoneExperience, normalizeStreakCount, normalizeStreakSegment, type StreakMilestone } from '../lib/streakDisplay';
import { isStreakAtRisk } from '../lib/streakFreeze';
import { firstRevealEventProps } from '../lib/activationMilestone';
import { StreakFreezeModal } from '../components/StreakFreezeModal';
import { shareStreakMilestoneCard } from '../lib/streakShare';
import { shareDailyHoroscopeCard } from '../lib/horoscopeShareCard';
import { track, trackDailyActiveOnce, trackRitualEvent } from '../lib/analytics';
import { BRAND_COPY } from '../lib/brandCopy';
import { shouldCompressExplanations } from '../lib/emotionalScreenHierarchy';
import { goToPremium, goToReflectionCheckIn } from '../navigation/navigationRef';
import { spacing } from '../theme';
import type { DailyRitualCompletion } from '@astralis/lib/types';
import { useI18n } from '../i18n';

const TAROT_GLYPH = '\u2728';
const CRYSTAL_GLYPH = '\u2726';
const TRANSIT_GLYPH = '\u2644';
const MOON_GLYPH = '\u263D';
const AFFIRM_GLYPH = '\u2600';

export function HomeScreen(): ReactElement {
  const theme = useSanctuaryTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, load: loadProfile, loading: profileLoading, error: profileError } = useProfile();
  const { horoscope, load, loadMine, completeToday, loading: horoLoading, error: horoError } = useHoroscope();
  const { state: reflectionState, loadState: loadReflectionState } = useReflection();
  const [horoscopePeriod, setHoroscopePeriod] = useState<HoroscopePeriod>('today');
  const [activeEnergy, setActiveEnergy] = useState<'love' | 'opportunity' | 'stress'>('opportunity');
  const [openMoment, setOpenMoment] = useState<'resonance' | 'reflection' | 'deeper' | 'closed' | null>(null);
  const [dailyStreak, setDailyStreak] = useState<DailyStreak>({ count: 0, lastCheckInDate: null });
  const [visibleMilestone, setVisibleMilestone] = useState<StreakMilestone | null>(null);
  const [completion, setCompletion] = useState<DailyRitualCompletion | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionPending, setCompletionPending] = useState(false);
  const [sequenceStarted, setSequenceStarted] = useState(false);
  const [readingRevealed, setReadingRevealed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [freezeModalVisible, setFreezeModalVisible] = useState(false);
  const [freezePending, setFreezePending] = useState(false);
  const [freezeError, setFreezeError] = useState<string | null>(null);
  const [freezePromptDate, setFreezePromptDate] = useState<string | null>(null);

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
  const hasServerRevealToday = Boolean(
    horoscope &&
      effectiveHoroscopePeriod === 'today' &&
      horoscope.streakLastDate &&
      horoscope.streakLastDate === horoscope.date,
  );
  const availableFreezes = horoscope?.streakFreezes ?? user?.streakFreezes ?? 0;
  const freezeCap = horoscope?.streakFreezeCap ?? user?.streakFreezeCap ?? 1;
  // Pattern Memory is only ever populated by the server for premium users; gate again
  // on the client so free users never see the section even if a payload leaks through.
  const patternMemory = isPremium ? horoscope?.patternMemory ?? null : null;
  const streakAtRisk =
    effectiveHoroscopePeriod === 'today' &&
    isStreakAtRisk({
      streakCount: horoscope?.streakCount ?? dailyStreak.count,
      streakFreezes: availableFreezes,
      streakLastDate: horoscope?.streakLastDate ?? dailyStreak.lastCheckInDate,
    });

  useEffect(() => {
    void loadDailyStreak().then(setDailyStreak);
  }, []);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReducedMotion);
    return () => sub?.remove?.();
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
    if (effectiveHoroscopePeriod === 'today' && !readingRevealed) return;
    void track('horoscope_viewed', { source: 'home', period: effectiveHoroscopePeriod, isPremium });
  }, [effectiveHoroscopePeriod, horoLoading, horoscope, isPremium, readingRevealed]);

  useEffect(() => {
    if (!horoscope || horoLoading || effectiveHoroscopePeriod !== 'today') return;
    void track('streak_status_viewed', {
      source: 'home_launch',
      streakCount: horoscope.streakCount ?? dailyStreak.count,
      longestStreakCount: horoscope.longestStreakCount ?? user?.longestStreakCount ?? 0,
      freezesRemaining: horoscope.streakFreezes ?? 0,
      nextMilestone: horoscope.nextMilestone ?? null,
      completedToday: (horoscope.streakLastDate ?? dailyStreak.lastCheckInDate) === localDateISO(),
    });
  }, [dailyStreak.count, dailyStreak.lastCheckInDate, effectiveHoroscopePeriod, horoLoading, horoscope, user?.longestStreakCount]);

  useEffect(() => {
    if (!horoscope || effectiveHoroscopePeriod !== 'today') {
      setReadingRevealed(effectiveHoroscopePeriod !== 'today');
      return;
    }
    if (hasServerRevealToday) {
      setReadingRevealed(true);
      void saveDailyReadingReveal(horoscope.date, user?.id);
      return;
    }
    let mounted = true;
    void loadDailyReadingReveal(horoscope.date, user?.id).then((revealed) => {
      if (mounted) setReadingRevealed(revealed);
    });
    return () => {
      mounted = false;
    };
  }, [effectiveHoroscopePeriod, hasServerRevealToday, horoscope, user?.id]);

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

  // Surface the "Use a Freeze?" prompt once per day when an active streak would
  // otherwise be lost and the user still holds a freeze.
  useEffect(() => {
    if (!streakAtRisk) return;
    const today = localDateISO();
    if (freezePromptDate === today) return;
    setFreezePromptDate(today);
    setFreezeError(null);
    setFreezeModalVisible(true);
    void track('streak_freeze_prompt_shown', {
      source: 'home',
      streakCount: horoscope?.streakCount ?? dailyStreak.count,
      freezesAvailable: availableFreezes,
    });
  }, [streakAtRisk, freezePromptDate, availableFreezes, horoscope?.streakCount, dailyStreak.count]);

  useEffect(() => {
    if (!patternMemory || !readingRevealed) return;
    void track('pattern_memory_shown', {
      source: 'home',
      theme: patternMemory.theme,
      kind: patternMemory.kind,
      daysAgo: patternMemory.daysAgo,
    });
  }, [patternMemory, readingRevealed]);

  // Accuracy Loop: once today's reading is revealed, load reflection state to drive the
  // morning acknowledgment block and the evening check-in card.
  useEffect(() => {
    if (effectiveHoroscopePeriod !== 'today' || !readingRevealed || !horoscope?.date) return;
    void loadReflectionState(horoscope.date);
  }, [effectiveHoroscopePeriod, readingRevealed, horoscope?.date, loadReflectionState]);

  useEffect(() => {
    if (!readingRevealed || !horoscope?.reflection) return;
    const yesterdayResonance = reflectionState?.yesterday?.resonance;
    if (!yesterdayResonance) return;
    void track('reflection_ack_viewed', { yesterdayResonance });
  }, [readingRevealed, horoscope?.reflection, reflectionState?.yesterday?.resonance]);

  useEffect(() => {
    if (profileLoading) return;
    const anims = opacities.map((o) =>
      Animated.timing(o, { toValue: 1, duration: 420, useNativeDriver: true }),
    );
    Animated.stagger(65, anims).start();
  }, [profileLoading, opacities]);

  const displayName = useMemo(() => {
    const u = profile?.user;
    if (!u) return t('home.defaultName');
    const n = (u.displayName ?? u.fullName).trim();
    return n || t('home.defaultName');
  }, [profile?.user, t]);

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
    reducedMotion,
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
    void track('streak_milestone_shared', { milestone: shareMilestone, source: 'home' });
    void shareStreakMilestoneCard({
      milestone: shareMilestone,
      zodiacSign: sun,
      displayName,
    });
  };

  const onHoroscopePeriodChange = (next: HoroscopePeriod): void => {
    setHoroscopePeriod(next);
    setSequenceStarted(false);
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

  const onCompleteDailyRitual = async (): Promise<DailyRitualCompletion | null> => {
    if (!horoscope || effectiveHoroscopePeriod !== 'today' || completionPending) return null;
    setCompletionPending(true);
    setCompletionError(null);
    try {
      const result = await completeToday();
      const nextLocal = await saveDailyStreak({
        count: result.currentStreak,
        lastCheckInDate: result.streakLastDate ?? result.completedDate,
      });
      setDailyStreak(nextLocal);
      await track('daily_ritual_completed', {
        completedDate: result.completedDate,
        currentStreak: result.currentStreak,
        alreadyCompletedToday: result.alreadyCompletedToday,
        shouldCelebrate: result.shouldCelebrate,
        milestone: result.milestoneReached,
      });
      // Activation milestone — gated by the server's once-per-user flag, so it fires at most once.
      const firstRevealProps = firstRevealEventProps({
        firstHoroscopeReveal: result.firstHoroscopeReveal,
        sign: sun,
        platform: Platform.OS,
        createdAt: user?.createdAt,
      });
      if (firstRevealProps) await track('first_horoscope_revealed', firstRevealProps);
      if (!result.shouldCelebrate) {
        setCompletion(null);
        await track('daily_ritual_completion_replayed_blocked', { completedDate: result.completedDate, source: 'home' });
        return result;
      }
      const canShow = await consumeDailyRitualCelebration(result.completedDate);
      if (!canShow) {
        setCompletion(null);
        await track('daily_ritual_completion_replayed_blocked', { completedDate: result.completedDate, source: 'home' });
        return result;
      }
      setCompletion(result);
      if (result.milestoneReached) {
        setVisibleMilestone(result.milestoneReached as StreakMilestone);
        await track('streak_milestone_reached', {
          streakCount: result.currentStreak,
          milestone: result.milestoneReached,
          freezeAwarded: result.streakFreezeAwarded,
        });
      }
      if (result.streakPreservedByFreeze) {
        await track('streak_freeze_used', {
          streakCount: result.currentStreak,
          freezesRemaining: result.freezeCount,
        });
      }
      await track('streak_completion_celebrated', {
        streakCount: result.currentStreak,
        milestone: result.milestoneReached,
        freezeAwarded: result.streakFreezeAwarded,
      });
      if (result.currentStreak === 1) await track('streak_started', { streakCount: 1 });
      return result;
    } catch (err) {
      setCompletionError(err instanceof Error ? err.message : t('home.completionError'));
      return null;
    } finally {
      setCompletionPending(false);
    }
  };

  const onRevealDailyReading = async (): Promise<void> => {
    if (!horoscope || effectiveHoroscopePeriod !== 'today' || completionPending) return;
    await track('daily_reading_reveal_clicked', { source: 'home', date: horoscope.date });
    if (readingRevealed || hasServerRevealToday) {
      setReadingRevealed(true);
      await saveDailyReadingReveal(horoscope.date, user?.id);
      await track('daily_reading_already_revealed', {
        source: 'home',
        date: horoscope.date,
        currentStreak: horoscope.streakCount,
      });
      return;
    }
    const completion = await onCompleteDailyRitual();
    setReadingRevealed(true);
    await saveDailyReadingReveal(horoscope.date, user?.id);
    if (completion?.alreadyCompletedToday) {
      await track('daily_reading_already_revealed', {
        source: 'home',
        date: completion.completedDate,
        currentStreak: completion.currentStreak,
      });
    } else {
      await track('daily_reading_revealed', {
        source: 'home',
        date: completion?.completedDate ?? horoscope.date,
        currentStreak: completion?.currentStreak,
      });
    }
  };

  // Consuming a freeze reuses the daily-completion flow: completing today after a
  // one-day gap makes the backend spend a freeze and preserve the streak. No streak
  // math or inventory logic is duplicated here.
  const onUseStreakFreeze = async (): Promise<void> => {
    if (freezePending || !horoscope) return;
    setFreezePending(true);
    setFreezeError(null);
    try {
      const result = await onCompleteDailyRitual();
      if (!result) {
        setFreezeError(completionError ?? t('streak.freezeError'));
        return;
      }
      setReadingRevealed(true);
      await saveDailyReadingReveal(horoscope.date, user?.id);
      setFreezeModalVisible(false);
    } finally {
      setFreezePending(false);
    }
  };

  const onDismissStreakFreeze = (): void => {
    if (freezePending) return;
    setFreezeModalVisible(false);
    void track('streak_freeze_prompt_dismissed', {
      source: 'home',
      streakCount: horoscope?.streakCount ?? dailyStreak.count,
      freezesAvailable: availableFreezes,
    });
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

      {showProfileSpinner ? <LoadingBlock message={t('home.gathering')} /> : null}
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
          longestStreakCount={horoscope?.longestStreakCount ?? user?.longestStreakCount ?? 0}
          streakFreezes={availableFreezes}
          streakFreezeCap={freezeCap}
          streakAtRisk={streakAtRisk}
          streakFreezeAwarded={Boolean(horoscope?.streakFreezeAwarded)}
          streakPreservedByFreeze={Boolean(horoscope?.streakPreservedByFreeze)}
          streakSegment={streakSegment}
          milestoneReached={visibleMilestone}
          nextMilestone={horoscope?.nextMilestone ?? null}
          streakLastDate={horoscope?.streakLastDate ?? dailyStreak.lastCheckInDate}
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
          sequenceStarted={sequenceStarted}
          onContinue={horoscope ? () => setSequenceStarted(true) : undefined}
        />
      </Animated.View>

      {horoscope && sequenceStarted && effectiveHoroscopePeriod === 'today' && !readingRevealed ? (
        <DailyRevealMoment
          streakCount={streakCount}
          pending={completionPending}
          error={completionError}
          onReveal={() => void onRevealDailyReading()}
        />
      ) : null}

      {!sun && !showProfileSpinner ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          {t('home.addChartHint')}
        </Text>
      ) : null}

      {sun && sequenceStarted && readingRevealed ? (
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
              accessibilityLabel={t('home.shareToday')}
            >
              <Text style={styles.dailyShareIcon}>{'\u2197'}</Text>
              <Text style={styles.dailyShareText}>{t('home.shareToday')}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {patternMemory && readingRevealed ? (
        <PatternMemoryCard
          memory={patternMemory}
          onOpen={() =>
            void track('pattern_memory_opened', {
              source: 'home',
              theme: patternMemory.theme,
              kind: patternMemory.kind,
            })
          }
        />
      ) : null}

      {readingRevealed && horoscope?.reflection ? <ReflectionAckCard text={horoscope.reflection} /> : null}

      {readingRevealed && horoscope && effectiveHoroscopePeriod === 'today' && reflectionState?.checkInPending ? (
        <EveningCheckInCard
          onPress={() =>
            goToReflectionCheckIn({ readingDate: horoscope.date, source: 'home_card' })
          }
        />
      ) : null}

      {horoscope && openMoment === 'reflection' ? (
        <Animated.View style={{ opacity: opacities[4]! }}>
          <WhyThisReadingCard horoscope={horoscope} compact={compressHome} />
        </Animated.View>
      ) : null}

      {sun && initialHoroscopePending ? (
        <LoadingBlock message={t('home.loadingSky')} />
      ) : null}

      {horoscope && readingRevealed ? (
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
          {sequenceStarted ? (
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
          ) : null}
          {completion?.shouldCelebrate ? (
            <RitualCompletionSheet completion={completion} reducedMotion={reducedMotion} />
          ) : null}
        </>
      ) : null}

      <StreakFreezeModal
        visible={freezeModalVisible}
        streakCount={streakCount}
        freezeCount={availableFreezes}
        freezeCap={freezeCap}
        pending={freezePending}
        error={freezeError}
        onUseFreeze={() => void onUseStreakFreeze()}
        onDismiss={onDismissStreakFreeze}
      />
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
  sequenceStarted,
  onContinue,
}: {
  horoscope: NonNullable<ReturnType<typeof useHoroscope>['horoscope']> | null;
  date: string;
  dominantSignal: string;
  compact: boolean;
  sequenceStarted: boolean;
  onContinue?: () => void;
}): ReactElement {
  void dominantSignal;
  void compact;
  const { t } = useI18n();
  // Arrival is an invitation, not the reading itself. The actual horoscope.overall
  // is revealed only in HoroscopePremiumCard, so this teaser must not echo its content.
  return (
    <View style={styles.nightlyArrival}>
      <Text style={styles.nightlyEyebrow}>{t('home.arrivalEyebrow')}</Text>
      <Text style={styles.nightlyTitle}>
        {horoscope ? t('home.arrivalTeaser') : t('home.arrivalPreparing')}
      </Text>
      <Text style={styles.nightlyMeta}>{date}</Text>
      {onContinue && !sequenceStarted ? (
        <Pressable
          style={styles.continueButton}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel={t('home.arrivalCta')}
        >
          <Text style={styles.continueText}>{t('home.arrivalCta')} →</Text>
        </Pressable>
      ) : null}
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
  const { t } = useI18n();
  if (openMoment === 'closed') {
    return (
      <View style={styles.quietClose}>
        <Text style={styles.quietCloseTitle}>{t('home.quietCloseTitle')}</Text>
        <Text style={styles.quietCloseBody}>{t('home.quietCloseBody')}</Text>
      </View>
    );
  }
  return (
    <View style={styles.sequenceControls}>
      <SequenceButton
        label={openMoment === 'resonance' ? t('home.seqResonanceOpen') : t('home.seqResonance')}
        disabled={openMoment === 'resonance'}
        onPress={() => onOpen('resonance')}
      />
      <SequenceButton
        label={openMoment === 'reflection' ? t('home.seqReflectionOpen') : t('home.seqReflection')}
        disabled={openMoment === 'reflection'}
        onPress={() => onOpen('reflection')}
      />
      <SequenceButton
        label={isPremium ? t('home.seqDeeperPremium') : t('home.seqDeeper')}
        disabled={openMoment === 'deeper'}
        onPress={() => onOpen('deeper')}
      />
      <Pressable
        style={({ pressed }) => [styles.closeSequenceButton, pressed && styles.pressed]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('home.seqCloseA11y')}
      >
        <Text style={styles.closeSequenceText}>{t('home.seqClose')}</Text>
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
  const { t } = useI18n();
  return (
    <View style={styles.premiumContinuation}>
      <Text style={styles.premiumContinuationTitle}>{t('home.premiumTitle')}</Text>
      <Text style={styles.premiumContinuationBody}>
        {t('home.premiumBody')}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.premiumContinuationButton, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('home.premiumButton')}
      >
        <Text style={styles.premiumContinuationButtonText}>{t('home.premiumButton')}</Text>
      </Pressable>
    </View>
  );
}

function DailyRevealMoment({
  streakCount,
  pending,
  error,
  onReveal,
}: {
  streakCount: number;
  pending: boolean;
  error: string | null;
  onReveal: () => void;
}): ReactElement {
  const { t } = useI18n();
  return (
    <View style={styles.completeMoment}>
      <Text style={styles.completeTitle}>{t('home.streakBadge', { count: streakCount })}</Text>
      <Text style={styles.completeBody}>{t('home.readingReady')}</Text>
      {error ? <Text style={styles.completeError}>{error}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.completeButton, pending && styles.completeButtonDisabled, pressed && !pending && styles.pressed]}
        onPress={onReveal}
        disabled={pending}
        accessibilityRole="button"
        accessibilityState={{ disabled: pending, busy: pending }}
        accessibilityLabel={t('home.revealReading')}
      >
        <Text style={styles.completeButtonText}>
          {pending ? t('home.revealingReading') : t('home.revealReading')}
        </Text>
      </Pressable>
    </View>
  );
}

function RitualCompletionSheet({
  completion,
  reducedMotion,
}: {
  completion: DailyRitualCompletion;
  reducedMotion: boolean;
}): ReactElement {
  const { t } = useI18n();
  const milestone = completion.milestoneReached as StreakMilestone | null;
  const milestoneText = milestone ? milestoneExperience(milestone).copy : null;
  return (
    <View style={[styles.completionSheet, reducedMotion && styles.completionSheetReduced]}>
      <View style={styles.completionHalo} />
      <Text style={styles.completionEyebrow}>{t('home.completionEyebrow')}</Text>
      <Text style={styles.completionTitle}>
        {t('home.completionTitle', { count: completion.currentStreak })}
      </Text>
      <Text style={styles.completionBody}>
        {milestoneText ?? t('home.completionBody')}
      </Text>
      {completion.streakPreservedByFreeze ? (
        <Text style={styles.completionMeta}>{t('streak.preserved')}</Text>
      ) : null}
      {completion.streakFreezeAwarded ? (
        <Text style={styles.completionMeta}>{t('streak.awarded')}</Text>
      ) : null}
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
  const { t } = useI18n();
  return (
    <View style={styles.whyReading}>
      <Text style={styles.whyReadingTitle}>{t('home.whyReadingTitle')}</Text>
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
  continueButton: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(184, 168, 255, 0.38)',
    backgroundColor: 'rgba(184, 168, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  continueText: {
    color: '#f5f3ff',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
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
    borderColor: 'rgba(244, 217, 139, 0.55)',
    backgroundColor: '#1E1A45',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
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
    borderColor: 'rgba(244, 217, 139, 0.32)',
    borderRadius: 22,
    backgroundColor: '#1A1635',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
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
  completeMoment: {
    borderWidth: 1,
    borderColor: 'rgba(167, 228, 196, 0.24)',
    borderRadius: 22,
    backgroundColor: 'rgba(8, 22, 34, 0.72)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  completeTitle: {
    color: '#f5f3ff',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '900',
  },
  completeBody: {
    color: '#c9c7df',
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  completeError: {
    color: '#ffb5b5',
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  completeButton: {
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: '#a7e4c4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  completeButtonDisabled: {
    opacity: 0.62,
  },
  completeButtonText: {
    color: '#081622',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  completionSheet: {
    borderWidth: 1,
    borderColor: 'rgba(244, 217, 139, 0.34)',
    borderRadius: 26,
    backgroundColor: 'rgba(24, 20, 43, 0.86)',
    padding: spacing.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  completionSheetReduced: {
    borderColor: 'rgba(216, 221, 255, 0.26)',
  },
  completionHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -72,
    top: -78,
    backgroundColor: 'rgba(244, 217, 139, 0.12)',
  },
  completionEyebrow: {
    color: '#f4d98b',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  completionTitle: {
    color: '#f5f3ff',
    marginTop: spacing.sm,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  completionBody: {
    color: '#d8d7ea',
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  completionMeta: {
    color: '#a7e4c4',
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
