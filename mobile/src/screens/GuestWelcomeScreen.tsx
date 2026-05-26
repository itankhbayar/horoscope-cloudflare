import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as horoscopeService from '@astralis/lib/horoscopeService';
import type { DailyHoroscope, GlobalSkyToday, PersonalSkyLayer, ZodiacSign } from '@astralis/lib/types';
import { getZodiacInfo, ZODIAC_SIGNS } from '@astralis/lib/zodiac';
import { AmbientRitualFrame } from '../components/AmbientRitualFrame';
import { useAppearance } from '../hooks/useAppearance';
import type { RootStackParamList } from '../navigation/types';
import { BRAND_COPY } from '../lib/brandCopy';
import { track } from '../lib/analytics';
import {
  ambientFatigueRisk,
  buildAmbientRitualState,
  type AmbientRitualState,
} from '../lib/ambientRitual';
import { getScreenPurpose, shouldCompressExplanations } from '../lib/emotionalScreenHierarchy';
import {
  emotionalMemoryExplanation,
  getEmotionalPatternMemory,
  recordEmotionalMemoryEvent,
  resetEmotionalPatternMemory,
  saveReflectionMoment,
  summarizeEmotionalPatternMemory,
  type EmotionalPatternSummary,
} from '../lib/emotionalPatternMemory';
import { shareGlobalSkyCard } from '../lib/globalSkyShareCard';
import {
  markFirstReadingViewed,
  recordGuestShare,
  recordGuestRitual,
  recordPreviewCardsSeen,
  updateGuestOnboardingState,
} from '../lib/progressiveOnboarding';
import { colors, hitSlopComfortable, MIN_TOUCH, spacing } from '../theme';

const PREVIEW_COUNT = 3;
const fallbackAmbientTheme = {
  key: 'moonlit-stillness' as const,
  label: 'Reflective moonlit stillness',
  background: '#050711',
  surface: 'rgba(18, 21, 40, 0.82)',
  text: '#f2f0ff',
  muted: '#aaaed0',
  accent: '#d8d7ff',
  overlayTop: 'rgba(216, 215, 255, 0.10)',
  overlayBottom: 'rgba(41, 67, 86, 0.18)',
  glowOpacity: 0.18,
  particleOpacity: 0,
  cardRadius: 24,
  cardGap: 18,
  readingLineHeight: 25,
  transitionMs: 0,
  shimmerMs: 0,
  hapticMs: 0,
  density: 'spacious' as const,
  soundscape: { id: 'none' as const, label: 'Silent by default', premium: false },
};

export function GuestWelcomeScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { palette, mode } = useAppearance();
  const [globalSky, setGlobalSky] = useState<GlobalSkyToday | null>(null);
  const [personalSky, setPersonalSky] = useState<PersonalSkyLayer | null>(null);
  const [horoscope, setHoroscope] = useState<DailyHoroscope | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [resonanceLoading, setResonanceLoading] = useState(false);
  const [quietHourEnabled, setQuietHourEnabled] = useState(false);
  const [ambientMode, setAmbientMode] = useState(false);
  const [soundscapeEnabled, setSoundscapeEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [memorySummary, setMemorySummary] = useState<EmotionalPatternSummary | null>(null);
  const [memoryExplainerOpen, setMemoryExplainerOpen] = useState(false);
  const [previewMomentsOpen, setPreviewMomentsOpen] = useState(false);
  const [resonanceOpen, setResonanceOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ambientModeRef = useRef(false);
  const isLight = mode === 'light';
  const screenPurpose = useMemo(() => getScreenPurpose('guest_welcome'), []);

  useEffect(() => {
    ambientModeRef.current = ambientMode;
  }, [ambientMode]);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!alive) return;
      setReducedMotion(enabled);
      if (enabled) void track('reduced_motion_usage', { enabled: true });
    });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled: boolean) => {
      setReducedMotion(enabled);
      void track('reduced_motion_usage', { enabled });
    });
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const startedAt = Date.now();
    void (async () => {
      try {
        const memory = await getEmotionalPatternMemory();
        if (alive) setMemorySummary(summarizeEmotionalPatternMemory(memory));
        const sky = await horoscopeService.fetchGlobalSkyToday();
        if (!alive) return;
        setGlobalSky(sky);
        await markFirstReadingViewed();
        void track('first_reading_viewed', { source: 'guest', sign: sky.moonSign, date: sky.date });
        void track('emotional_feed_engaged', { source: 'guest', depth: sky.cards.length });
        void track('guest_session_depth', { depth: sky.cards.length, stage: 'global_sky_feed' });

        const moonPreview = await horoscopeService.fetchDailyHoroscope(sky.moonSign, sky.date);
        if (alive) setHoroscope(moonPreview);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load today\'s sky.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      void track('emotional_feed_dwell', { source: 'guest', seconds });
      void track('ritual_session_duration', { seconds, mode: ambientModeRef.current ? 'ambient' : 'standard' });
    };
  }, []);

  const ambientState: AmbientRitualState | null = useMemo(() => {
    if (!globalSky) return null;
    return buildAmbientRitualState(globalSky, personalSky, {
      quietHour: quietHourEnabled,
      reducedMotion,
      premium: false,
    });
  }, [globalSky, personalSky, quietHourEnabled, reducedMotion]);

  const previewCards = useMemo(() => {
    if (!globalSky) return [];
    const [first, second] = globalSky.cards;
    return [
      { title: first?.title ?? 'Tonight\'s atmosphere', body: first?.body ?? globalSky.summary },
      { title: second?.title ?? 'Social weather', body: second?.body ?? globalSky.shareLine },
      { title: 'Partial personalization preview', body: horoscope?.overall ?? atmosphereLine(globalSky) },
    ];
  }, [globalSky, horoscope]);

  const compressExplanations = shouldCompressExplanations({
    returningUser: Boolean(memorySummary && memorySummary.eventCount > 0),
    ambientMode,
    reducedMotion,
    ritualNights: memorySummary?.ritualNights ?? 0,
  });

  useEffect(() => {
    if (previewCards.length < PREVIEW_COUNT) return;
    void recordPreviewCardsSeen(PREVIEW_COUNT);
    void track('onboarding_step_completed', { step: 'guest_preview_cards_seen', guest: true });
  }, [previewCards.length]);

  const goSignup = useCallback((): void => {
    void updateGuestOnboardingState({ stage: 'signup_prompted' });
    void track('onboarding_step_completed', { step: 'guest_soft_conversion_cta', guest: true });
    void track('signup_timing_conversion', { timing: globalSky ? 'after_global_sky' : 'after_preview' });
    navigation.navigate('Register');
  }, [globalSky, navigation]);

  const loadPersonalSky = useCallback(async (input: { sign: ZodiacSign } | { birthDate: string }): Promise<void> => {
    setResonanceLoading(true);
    try {
      const layer = await horoscopeService.fetchPersonalSkyLayer(input);
      setPersonalSky(layer);
      void updateGuestOnboardingState(
        'sign' in input
          ? { preferredSign: input.sign, stage: 'zodiac_collected' }
          : { birthDate: input.birthDate, stage: 'birth_date_collected' },
      );
      void recordGuestRitual(layer.date);
      void recordEmotionalMemoryEvent({
        type: 'resonance_viewed',
        date: layer.date,
        signal: layer.ritualCards[0]?.signal ?? 'reflection',
        moonPhase: layer.sky.moonPhase,
        resonanceScore: layer.resonanceScore,
      }).then((summary) => {
        setMemorySummary(summary);
        void track('emotional_continuity_retention', { ritualNights: summary.ritualNights });
      });
      void track('resonance_personalization_completed', {
        method: layer.personalization,
        sign: layer.sign,
        resonanceScore: layer.resonanceScore,
      });
      void track('personalized_preview_completed', { method: layer.personalization });
      void track('nightly_ritual_return', { date: layer.date, source: 'guest' });
      void track('emotional_memory_opt_in', { source: 'guest_ritual' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not personalize tonight\'s sky.');
    } finally {
      setResonanceLoading(false);
    }
  }, []);

  const resetMemory = useCallback((): void => {
    void resetEmotionalPatternMemory().then((summary) => {
      setMemorySummary(summary);
      void track('emotional_memory_reset', { source: 'guest_ritual' });
    });
  }, []);

  const goLogin = useCallback((): void => {
    navigation.navigate('Login');
  }, [navigation]);

  const shareGuestReading = useCallback((): void => {
    if (!globalSky) return;
    void (async () => {
      await recordGuestShare();
      await shareGlobalSkyCard(globalSky);
    })();
  }, [globalSky]);

  const toggleAmbientMode = useCallback((): void => {
    if (!ambientState) return;
    const next = !ambientMode;
    setAmbientMode(next);
    void track('ambient_mode_usage', { enabled: next, theme: ambientState.theme.key });
    void track('atmosphere_theme_preference', { theme: ambientState.theme.key, source: 'auto' });
    if (next) {
      void track('emotional_pacing_engagement', {
        screen: screenPurpose.screen,
        moment: screenPurpose.moment,
        rhythm: screenPurpose.pacingRhythm,
      });
      void track('nighttime_return_behavior', { date: globalSky?.date ?? new Date().toISOString().slice(0, 10), mode: 'ambient' });
      const fatigue = ambientFatigueRisk([
        ambientState.singleLine,
        personalSky?.reflectionPrompt ?? '',
        personalSky?.dreamSleepTone ?? '',
      ]);
      void track('calm_reading_engagement', { theme: ambientState.theme.key, fatigueRisk: fatigue });
      if (!reducedMotion && ambientState.theme.hapticMs > 0) {
        Vibration.vibrate(ambientState.theme.hapticMs);
        void track('sensory_feature_opt_in', { feature: 'haptics', enabled: true });
      }
    }
  }, [ambientMode, ambientState, globalSky?.date, personalSky?.dreamSleepTone, personalSky?.reflectionPrompt, reducedMotion]);

  return (
    <AmbientRitualFrame theme={ambientState?.theme ?? fallbackAmbientTheme} active={ambientMode} reducedMotion={reducedMotion}>
    <SafeAreaView
      style={[styles.safe, { backgroundColor: ambientMode && ambientState ? ambientState.theme.background : palette.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.brand, { color: isLight ? palette.accent : colors.gold }]}>{BRAND_COPY.mark}</Text>
        <Text style={[styles.kicker, { color: colors.gold }]}>{screenPurpose.atmosphericTone}</Text>
        <Text style={[styles.title, { color: palette.text }]}>The sky is already doing something.</Text>
        {!compressExplanations ? (
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Start with the real collective weather. Personal details can wait.
          </Text>
        ) : null}

        {ambientState ? (
          <View style={[styles.ambientPanel, { borderColor: ambientMode ? ambientState.theme.accent : palette.border, backgroundColor: ambientMode ? ambientState.theme.surface : isLight ? '#ffffff' : palette.surface }]}>
            <Text style={[styles.ambientEyebrow, { color: ambientState.theme.accent }]}>Ambient ritual</Text>
            <Text style={[styles.ambientTitle, { color: ambientMode ? ambientState.theme.text : palette.text }]}>{ambientState.theme.label}</Text>
              {!compressExplanations ? (
                <Text style={[styles.ambientLine, { color: ambientMode ? ambientState.theme.muted : palette.textMuted }]}>
                  {ambientState.pauseLabel}
                </Text>
              ) : null}
            <Text style={[styles.singleLine, { color: ambientMode ? ambientState.theme.text : palette.text }]}>
              {ambientState.singleLine}
            </Text>
            <View style={styles.ambientActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.ambientButton,
                  { borderColor: ambientState.theme.accent },
                  pressed && styles.pressed,
                ]}
                onPress={toggleAmbientMode}
                accessibilityRole="button"
                accessibilityLabel={ambientMode ? 'Leave ambient ritual mode' : 'Enter ambient ritual mode'}
                hitSlop={hitSlopComfortable}
              >
                <Text style={[styles.ambientButtonText, { color: ambientState.theme.accent }]}>
                  {ambientMode ? 'Leave ambient mode' : 'Enter ambient mode'}
                </Text>
              </Pressable>
              {!ambientMode ? <Pressable
                style={({ pressed }) => [
                  styles.ambientIconButton,
                  { borderColor: ambientState.theme.accent },
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  const next = !soundscapeEnabled;
                  setSoundscapeEnabled(next);
                  void track('sensory_feature_opt_in', { feature: 'soundscape', enabled: next });
                  void track('soundscape_engagement', {
                    soundscape: ambientState.theme.soundscape.id,
                    action: next ? 'preview' : 'stop',
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel="Toggle silent soundscape preview"
                hitSlop={hitSlopComfortable}
              >
                <Text style={[styles.ambientButtonText, { color: ambientState.theme.accent }]}>
                  {soundscapeEnabled ? 'Silent' : 'Sound'}
                </Text>
              </Pressable> : null}
            </View>
            {soundscapeEnabled ? (
              <Text style={[styles.soundscapeNote, { color: ambientMode ? ambientState.theme.muted : palette.textMuted }]}>
                Soundscape hook: {ambientState.theme.soundscape.label}. Audio remains off until a future explicit opt-in.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.heroCard,
            {
              borderColor: ambientMode && ambientState ? ambientState.theme.accent : palette.border,
              backgroundColor: ambientMode && ambientState ? ambientState.theme.surface : isLight ? '#ffffff' : palette.surface,
              borderRadius: ambientMode && ambientState ? ambientState.theme.cardRadius : 24,
            },
          ]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.accent} />
              <Text style={[styles.loadingText, { color: palette.textMuted }]}>Reading today&apos;s sky...</Text>
            </View>
          ) : null}
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          {globalSky ? (
            <>
              <Text style={[styles.glyph, { color: colors.gold }]}>{'\u263D'}</Text>
              <Text style={[styles.heroLabel, { color: ambientMode && ambientState ? ambientState.theme.muted : palette.textMuted }]}>Global sky today</Text>
              <Text style={[styles.heroTitle, { color: ambientMode && ambientState ? ambientState.theme.text : palette.text }]}>Moon in {getZodiacInfo(globalSky.moonSign).name}</Text>
              <Text style={[styles.heroBody, { color: ambientMode && ambientState ? ambientState.theme.text : palette.text, lineHeight: ambientMode && ambientState ? ambientState.theme.readingLineHeight : 25 }]}>
                {ambientMode ? globalSky.headline : globalSky.summary}
              </Text>
              <Text style={[styles.weather, { color: ambientMode && ambientState ? ambientState.theme.accent : colors.gold }]}>
                {globalSky.moonPhase} | tension {globalSky.atmosphere.tension} | clarity {globalSky.atmosphere.clarity}
              </Text>
            </>
          ) : null}
        </View>

        {!ambientMode ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.momentDisclosure, { borderColor: palette.border }, pressed && styles.pressed]}
              onPress={() => {
                setPreviewMomentsOpen((current) => !current);
                void track('text_expansion_used', { screen: screenPurpose.screen, moment: 'arrival' });
                void track('hidden_control_discovered', { screen: screenPurpose.screen, control: 'preview_moments' });
              }}
              accessibilityRole="button"
              accessibilityLabel={previewMomentsOpen ? 'Hide preview moments' : 'Show preview moments'}
            >
              <Text style={[styles.secondaryText, { color: palette.accent }]}>
                {previewMomentsOpen ? 'Let the sky breathe' : 'Preview tonight in three fragments'}
              </Text>
            </Pressable>
            {previewMomentsOpen ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
                {previewCards.slice(0, 2).map((card) => (
                  <View key={card.title} style={[styles.previewCard, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
                    <Text style={[styles.previewTitle, { color: palette.text }]}>{card.title}</Text>
                    <Text style={[styles.previewBody, { color: palette.textMuted }]}>{card.body}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </>
        ) : null}

        <View style={[styles.resonancePanel, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
          <Text style={[styles.previewTitle, { color: palette.text }]}>How tonight affects you</Text>
          {!personalSky && !resonanceOpen ? (
            <Pressable
              style={({ pressed }) => [styles.momentDisclosure, { borderColor: palette.border }, pressed && styles.pressed]}
              onPress={() => {
                setResonanceOpen(true);
                void track('atmosphere_first_navigation_success', { from: 'arrival', to: 'resonance', moment: 'resonance' });
              }}
              accessibilityRole="button"
              accessibilityLabel="Add a light personal resonance"
            >
              <Text style={[styles.secondaryText, { color: palette.accent }]}>Add a light personal echo</Text>
            </Pressable>
          ) : null}
          {resonanceOpen || personalSky ? (
            <>
          {!compressExplanations ? (
            <Text style={[styles.previewBody, { color: palette.textMuted }]}>
              A sign or birthday is enough for now.
            </Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.signRow}>
            {ZODIAC_SIGNS.map((item) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.signChip,
                  { borderColor: personalSky?.sign === item.key ? colors.gold : palette.border },
                  pressed && styles.pressed,
                ]}
                onPress={() => void loadPersonalSky({ sign: item.key })}
                accessibilityRole="button"
                accessibilityLabel={`Personalize with ${item.name}`}
                hitSlop={hitSlopComfortable}
              >
                <Text style={[styles.signSymbol, { color: colors.gold }]}>{item.symbol}</Text>
                <Text style={[styles.signName, { color: palette.text }]}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.birthDateRow}>
            <TextInput
              style={[styles.birthDateInput, { borderColor: palette.border, color: palette.text, backgroundColor: isLight ? '#ffffff' : palette.background }]}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="Birth date YYYY-MM-DD"
              placeholderTextColor={palette.textMuted}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Birth date for lightweight personalization"
            />
            <Pressable
              style={({ pressed }) => [styles.birthDateButton, pressed && styles.pressed]}
              onPress={() => void loadPersonalSky({ birthDate: birthDate.trim() })}
              disabled={!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim()) || resonanceLoading}
              accessibilityRole="button"
              accessibilityLabel="Use birth date for lightweight personalization"
              hitSlop={hitSlopComfortable}
            >
              <Text style={styles.birthDateButtonText}>{resonanceLoading ? 'Reading...' : 'Use'}</Text>
            </Pressable>
          </View>
            </>
          ) : null}
          {personalSky ? (
            <View style={styles.ritualStack}>
              <Text style={[styles.personalHeadline, { color: palette.text }]}>{personalSky.headline}</Text>
              <Text style={[styles.personalBody, { color: palette.text }]}>{personalSky.howTonightAffectsYou}</Text>
              {personalSky.ritualCards.slice(0, quietHourEnabled ? 1 : 2).map((card) => (
                <Pressable
                  key={card.id}
                  style={({ pressed }) => [styles.ritualCard, { borderColor: palette.border }, pressed && styles.pressed]}
                  onPress={() => {
                    if (card.id === 'reflection-prompt') {
                      void track('reflection_prompt_engaged', { source: 'guest', promptId: card.id });
                      void saveReflectionMoment(card, personalSky).then((summary) => {
                        setMemorySummary(summary);
                        void track('reflection_save_rate', { archiveCount: summary.archiveCount });
                      });
                    } else {
                      void track('emotional_weather_interaction', { source: 'guest', signal: card.signal });
                      void recordEmotionalMemoryEvent({
                        type: card.id === 'relationship-atmosphere' ? 'relationship_atmosphere_opened' : 'ritual_card_opened',
                        date: personalSky.date,
                        signal: card.signal,
                        moonPhase: personalSky.sky.moonPhase,
                        ritualCardId: card.id,
                        resonanceScore: personalSky.resonanceScore,
                      }).then(setMemorySummary);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={card.title}
                >
                  <Text style={[styles.ritualTitle, { color: colors.gold }]}>{card.title}</Text>
                  <Text style={[styles.ritualBody, { color: palette.textMuted }]}>{card.body}</Text>
                </Pressable>
              ))}
              {!compressExplanations ? <Text style={[styles.premiumBridge, { color: palette.textMuted }]}>{personalSky.premiumBridge}</Text> : null}
              <Pressable
                style={({ pressed }) => [
                  styles.quietHourButton,
                  { borderColor: quietHourEnabled ? colors.gold : palette.border },
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  const next = !quietHourEnabled;
                  setQuietHourEnabled(next);
                  void track('quiet_hour_usage', { source: 'guest', enabled: next });
                  if (next) {
                    void recordEmotionalMemoryEvent({
                      type: 'quiet_hour_enabled',
                      date: personalSky.date,
                      signal: personalSky.ritualCards[0]?.signal ?? 'reflection',
                      moonPhase: personalSky.sky.moonPhase,
                      resonanceScore: personalSky.resonanceScore,
                    }).then(setMemorySummary);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Toggle quiet hour mode"
              >
                <Text style={[styles.quietHourTitle, { color: palette.text }]}>
                  {quietHourEnabled ? 'Quiet hour is on' : 'Start quiet hour'}
                </Text>
                <Text style={[styles.ritualBody, { color: palette.textMuted }]}>{personalSky.quietHourSuggestion}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {memorySummary && memorySummary.eventCount > 0 ? (
          <View style={[styles.memoryPanel, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
            <Text style={[styles.memoryEyebrow, { color: colors.gold }]}>Emotional pattern memory</Text>
            <Text style={[styles.personalHeadline, { color: palette.text }]}>Your recent emotional rhythm</Text>
            {memorySummary.insights.slice(0, memoryExplainerOpen ? 3 : 1).map((insight) => (
              <Text key={insight} style={[styles.memoryInsight, { color: palette.textMuted }]}>
                {insight}
              </Text>
            ))}
            {memoryExplainerOpen ? <View style={styles.memoryMetaRow}>
              <Text style={[styles.memoryMeta, { color: palette.textMuted }]}>{memorySummary.ritualNights} ritual nights</Text>
              <Text style={[styles.memoryMeta, { color: palette.textMuted }]}>{memorySummary.archiveCount} saved moments</Text>
            </View> : null}
            {memoryExplainerOpen ? (
              <Text style={[styles.memoryExplanation, { color: palette.textMuted }]}>{emotionalMemoryExplanation()}</Text>
            ) : null}
            <View style={styles.memoryActions}>
              <Pressable
                style={({ pressed }) => [styles.memoryButton, { borderColor: palette.border }, pressed && styles.pressed]}
                onPress={() => {
                  setMemoryExplainerOpen((current) => !current);
                  void track('ritual_history_engaged', {
                    ritualNights: memorySummary.ritualNights,
                    archiveCount: memorySummary.archiveCount,
                  });
                  void track('text_expansion_used', { screen: 'guest_welcome', moment: 'archive_revisit' });
                }}
                accessibilityRole="button"
                accessibilityLabel="Explain emotional memory"
              >
                <Text style={[styles.memoryButtonText, { color: palette.accent }]}>{memoryExplainerOpen ? 'Simplify' : 'Open memory'}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.memoryButton, { borderColor: palette.border }, pressed && styles.pressed]}
                onPress={resetMemory}
                accessibilityRole="button"
                accessibilityLabel="Reset emotional memory"
              >
                <Text style={[styles.memoryButtonText, { color: palette.textMuted }]}>Reset</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={goSignup}
            accessibilityRole="button"
            accessibilityLabel="Get your personalized sky"
            hitSlop={hitSlopComfortable}
          >
            <Text style={styles.primaryText}>Get your personalized sky</Text>
          </Pressable>
          {!ambientMode ? <Pressable
            style={({ pressed }) => [styles.secondaryButton, { borderColor: palette.border }, pressed && styles.pressed]}
            onPress={shareGuestReading}
            disabled={!globalSky}
            accessibilityRole="button"
            accessibilityLabel="Share today's sky"
            hitSlop={hitSlopComfortable}
          >
            <Text style={[styles.secondaryText, { color: palette.accent }]}>Share today&apos;s sky</Text>
          </Pressable> : null}
          <Pressable
            style={({ pressed }) => [styles.loginLink, pressed && styles.pressed]}
            onPress={goLogin}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            hitSlop={hitSlopComfortable}
          >
            <Text style={[styles.loginText, { color: palette.textMuted }]}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
    </AmbientRitualFrame>
  );
}

function atmosphereLine(sky: GlobalSkyToday): string {
  const strongest = Object.entries(sky.atmosphere).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'reflection';
  const label = strongest.replace(/[A-Z]/g, (match) => ` ${match.toLowerCase()}`);
  return `The strongest collective signal is ${label}. ${sky.shareLine}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  brand: {
    textAlign: 'center',
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  kicker: {
    marginTop: spacing.lg,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  heroCard: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing.lg,
    minHeight: 330,
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  glyph: {
    textAlign: 'center',
    fontSize: 78,
    lineHeight: 90,
  },
  heroLabel: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '900',
  },
  heroBody: {
    marginTop: spacing.md,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  weather: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  previewRow: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  previewCard: {
    width: 260,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  momentDisclosure: {
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  previewTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  previewBody: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  ambientPanel: {
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  ambientEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ambientTitle: { fontSize: 19, lineHeight: 25, fontWeight: '900' },
  ambientLine: { fontSize: 13, lineHeight: 19, fontWeight: '700' },
  singleLine: { fontSize: 17, lineHeight: 25, fontWeight: '800' },
  ambientActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ambientButton: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  ambientIconButton: {
    minWidth: 86,
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  ambientButtonText: { fontSize: 13, lineHeight: 18, fontWeight: '900' },
  soundscapeNote: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
  resonancePanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  signRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  signChip: {
    minWidth: 92,
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  signSymbol: { fontSize: 20, lineHeight: 24, fontWeight: '900' },
  signName: { marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  birthDateRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  birthDateInput: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontWeight: '700',
  },
  birthDateButton: {
    minHeight: MIN_TOUCH,
    minWidth: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  birthDateButtonText: { color: '#fff', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  ritualStack: { gap: spacing.sm, marginTop: spacing.sm },
  personalHeadline: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
  personalBody: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  ritualCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: 'rgba(184, 168, 255, 0.08)',
  },
  ritualTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ritualBody: { marginTop: 4, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  premiumBridge: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
  quietHourButton: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: 'rgba(8, 22, 34, 0.12)',
  },
  quietHourTitle: { fontSize: 15, lineHeight: 20, fontWeight: '900' },
  memoryPanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  memoryEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  memoryInsight: { fontSize: 13, lineHeight: 20, fontWeight: '700' },
  memoryMetaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  memoryMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  memoryExplanation: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
  memoryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  memoryButton: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  memoryButtonText: { fontSize: 13, lineHeight: 18, fontWeight: '900' },
  actions: { gap: spacing.sm },
  primaryButton: {
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryText: { color: '#fff', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  secondaryButton: {
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondaryText: { fontSize: 15, lineHeight: 20, fontWeight: '900' },
  loginLink: {
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  error: { color: colors.danger, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.84 },
});
