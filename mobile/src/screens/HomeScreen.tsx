import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EnergyDetailsCard } from '../components/home/EnergyDetailsCard';
import { EnergyRing } from '../components/home/EnergyRing';
import { HomeHeader } from '../components/home/HomeHeader';
import { HoroscopePremiumCard } from '../components/home/HoroscopePremiumCard';
import type { HoroscopePeriod } from '../components/home/homeDateUtils';
import {
  currentSkySummary,
  energyNarrative,
  stableFill,
  strongestTransitCopy,
} from '../components/home/homeContentUtils';
import { useSanctuaryTheme } from '../components/home/sanctuaryTheme';
import { LoadingBlock } from '../components/LoadingBlock';
import { ScreenScroll } from '../components/ScreenScroll';
import { useAuth } from '../hooks/useAuth';
import { useHoroscope } from '../hooks/useHoroscope';
import { usePeriodHoroscope } from '../hooks/usePeriodHoroscope';
import { useProfile } from '../hooks/useProfile';
import type { PeriodType, DailyHoroscope, ZodiacSign } from '@astralis/lib/types';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { MainTabNav, MainTabParamList } from '../navigation/types';
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
import { goToAllSigns, goToPremium } from '../navigation/navigationRef';
import { spacing } from '../theme';
import type { DailyRitualCompletion } from '@astralis/lib/types';
import { useI18n, type TranslationKey } from '../i18n';
import { useZodiacMode } from '../hooks/useZodiacMode';
import { EasternHome } from './home/EasternHome';


/**
 * Home adapts to the app-wide zodiac mode preference (toggled in Profile, like
 * language) rather than to navigation: Eastern mode shows the animal-sign home,
 * Western mode shows the natal/sun-sign ritual flow. Gated on `ready` so an
 * Eastern user never flashes the Western flow on cold start.
 */
export function HomeScreen(): ReactElement {
  const { mode, ready } = useZodiacMode();
  const { t } = useI18n();
  if (!ready) {
    return (
      <ScreenScroll>
        <LoadingBlock message={t('home.gathering')} />
      </ScreenScroll>
    );
  }
  return mode === 'eastern' ? <EasternHome /> : <WesternHome />;
}

function WesternHome(): ReactElement {
  const theme = useSanctuaryTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, load: loadProfile, loading: profileLoading, error: profileError } = useProfile();
  const { horoscope, load, loadMine, completeToday, loading: horoLoading, error: horoError } = useHoroscope();
  const { reading: periodReading, loading: periodLoading, error: periodError, load: loadPeriod } = usePeriodHoroscope();
  const route = useRoute<RouteProp<MainTabParamList, 'Home'>>();
  const navigation = useNavigation<MainTabNav>();
  // A sign chosen from the All Signs grid overrides which sign Home shows. null = your own sun sign.
  const [selectedSign, setSelectedSign] = useState<ZodiacSign | null>(null);
  const [horoscopePeriod, setHoroscopePeriod] = useState<HoroscopePeriod>('today');
  const [activeEnergy, setActiveEnergy] = useState<'love' | 'opportunity' | 'stress'>('opportunity');
  const [dailyStreak, setDailyStreak] = useState<DailyStreak>({ count: 0, lastCheckInDate: null });
  const [visibleMilestone, setVisibleMilestone] = useState<StreakMilestone | null>(null);
  const [completion, setCompletion] = useState<DailyRitualCompletion | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionPending, setCompletionPending] = useState(false);
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
  // The sign Home currently shows: a sign picked from All Signs overrides the user's own sun.
  const displaySign = selectedSign ?? sun;
  const isOwnSign = !selectedSign || selectedSign === sun;

  // Pick up a sign chosen on the All Signs screen (navigated back to the Home tab with a param).
  useEffect(() => {
    const paramSign = route.params?.sign;
    if (paramSign) setSelectedSign(paramSign);
  }, [route.params?.sign]);

  // Tapping the Home tab returns to your own reading (clears any sign picked from All Signs).
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      setSelectedSign(null);
      navigation.setParams({ sign: undefined });
    });
    return unsubscribe;
  }, [navigation]);

  // Premium flag is sourced from auth session (kept fresh by billing refresh flow).
  // Fall back to profile payload when auth user is not ready yet.
  const isPremium = Boolean(user?.isPremium ?? profile?.user?.isPremium);
  // Period tabs (Today / Week / Month / Year) are available to everyone — weekly/monthly/yearly
  // readings come from the public period endpoints.
  const effectiveHoroscopePeriod: HoroscopePeriod = horoscopePeriod;
  const periodType: PeriodType | null =
    horoscopePeriod === 'weekly'
      ? 'weekly'
      : horoscopePeriod === 'monthly'
        ? 'monthly'
        : horoscopePeriod === 'annual'
          ? 'yearly'
          : null;
  const hasServerRevealToday = Boolean(
    horoscope &&
      effectiveHoroscopePeriod === 'today' &&
      horoscope.streakLastDate &&
      horoscope.streakLastDate === horoscope.date,
  );
  const availableFreezes = horoscope?.streakFreezes ?? user?.streakFreezes ?? 0;
  const freezeCap = horoscope?.streakFreezeCap ?? user?.streakFreezeCap ?? 1;
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
    if (!displaySign) return;
    if (horoscopePeriod === 'today') {
      // Own sign → personalized reading (streak, pattern memory). Other sign → public daily reading.
      if (isOwnSign) void loadMine();
      else void load(displaySign, localDateISO());
      return;
    }
    if (periodType) void loadPeriod(displaySign, periodType);
  }, [displaySign, isOwnSign, horoscopePeriod, periodType, loadMine, load, loadPeriod]);

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
      // Non-today periods render their own PeriodReadingCard (no reveal gate), so keep the
      // daily reveal/reading blocks hidden here.
      setReadingRevealed(false);
      return;
    }
    if (!isOwnSign) {
      // Browsing another sign — no reveal ritual / streak; show its reading directly.
      setReadingRevealed(true);
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
  }, [effectiveHoroscopePeriod, hasServerRevealToday, horoscope, user?.id, isOwnSign]);

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

  useEffect(() => {
    void track('home_sequence_started', { dominantSignal });
  }, [dominantSignal]);

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

      <Animated.View style={{ opacity: opacities[0]! }}>
        <Pressable
          style={({ pressed }) => [
            styles.allSignsLink,
            { borderColor: theme.cardBorder, backgroundColor: theme.surfaceTint },
            pressed && styles.allSignsLinkPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('allSigns.title')}
          onPress={() => {
            void track('all_signs_opened', { source: 'home' });
            goToAllSigns();
          }}
        >
          <Text style={[styles.allSignsText, { color: theme.text }]}>{'✦  ' + t('allSigns.title')}</Text>
          <Text style={[styles.allSignsChevron, { color: theme.textMuted }]} allowFontScaling={false}>
            {'›'}
          </Text>
        </Pressable>
      </Animated.View>

      {displaySign ? <PeriodTabs value={horoscopePeriod} onChange={onHoroscopePeriodChange} /> : null}

      {displaySign && periodType ? (
        <HoroscopePremiumCard
          horoscope={
            periodReading
              ? ({ ...periodReading, date: periodReading.periodKey } as unknown as DailyHoroscope)
              : null
          }
          period={horoscopePeriod}
          onPeriodChange={onHoroscopePeriodChange}
          isPremium
          alwaysExpanded
          loading={Boolean(periodLoading)}
          error={periodError}
          eyebrow={
            horoscopePeriod === 'weekly'
              ? t('period.thisWeek')
              : horoscopePeriod === 'monthly'
                ? t('period.thisMonth')
                : t('period.thisYear')
          }
        />
      ) : null}

      {isOwnSign && horoscope && effectiveHoroscopePeriod === 'today' && !readingRevealed ? (
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

      {displaySign && readingRevealed ? (
        <Animated.View style={{ opacity: opacities[4]! }}>
          <HoroscopePremiumCard
            horoscope={horoscope}
            period={horoscopePeriod}
            onPeriodChange={onHoroscopePeriodChange}
            isPremium={isPremium}
            alwaysExpanded
            loading={Boolean(horoLoading)}
            error={horoError}
            eyebrow={isOwnSign ? undefined : t(`zodiac.${displaySign}` as TranslationKey)}
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
          {isOwnSign && horoscope && effectiveHoroscopePeriod === 'today' ? (
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


      {sun && initialHoroscopePending ? (
        <LoadingBlock message={t('home.loadingSky')} />
      ) : null}

      {isOwnSign && horoscope && readingRevealed && completion?.shouldCelebrate ? (
        <RitualCompletionSheet completion={completion} reducedMotion={reducedMotion} />
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
function PeriodTabs({
  value,
  onChange,
}: {
  value: HoroscopePeriod;
  onChange: (next: HoroscopePeriod) => void;
}): ReactElement {
  const theme = useSanctuaryTheme();
  const { t } = useI18n();
  const tabs: Array<{ key: HoroscopePeriod; label: string }> = [
    { key: 'today', label: t('period.today') },
    { key: 'weekly', label: t('period.weekly') },
    { key: 'monthly', label: t('period.monthly') },
    { key: 'annual', label: t('period.yearly') },
  ];
  return (
    <View style={styles.periodTabs}>
      {tabs.map((tab) => {
        const selected = value === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={({ pressed }) => [
              styles.periodTab,
              {
                borderColor: selected ? theme.lavender : theme.cardBorder,
                backgroundColor: selected ? 'rgba(184, 168, 255, 0.16)' : 'transparent',
              },
              pressed && styles.pressed,
            ]}
            onPress={() => onChange(tab.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
          >
            <Text style={[styles.periodTabText, { color: selected ? theme.text : theme.textMuted }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
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
  ringCenterWrap: {
    transform: [{ translateY: -6 }],
  },
  hint: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  allSignsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  allSignsLinkPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  allSignsText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  allSignsChevron: {
    fontSize: 20,
    fontWeight: '800',
  },
  periodTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  periodTab: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
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
