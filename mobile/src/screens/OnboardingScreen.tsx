import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LegalLinks } from '../components/LegalLinks';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { track } from '../lib/analytics';
import { colors, hitSlopComfortable, MIN_TOUCH, spacing } from '../theme';
import { useAppearance } from '../hooks/useAppearance';
import { BRAND_COPY, ONBOARDING_COPY } from '../lib/brandCopy';
import { buildNatalRevealCards, skyMappingStep, whyBirthplaceMatters } from '../lib/onboardingReveal';

type Props = {
  onComplete: (hasBirthProfile: boolean) => Promise<void>;
};

const CARDS = [
  {
    title: 'Astronomically calculated',
    body: 'Astralis uses real planetary positions to build your chart. Astrology is interpreted from the sky map, not treated as science.',
  },
  {
    title: 'Place matters',
    body: 'The sky above your birthplace shapes houses and angles. That is why your city is part of the ritual.',
  },
  {
    title: 'Mongolia in the atmosphere',
    body: "Built beneath Mongolia's vast night sky, designed for anyone looking up from anywhere.",
  },
];

export function OnboardingScreen({ onComplete }: Props): React.JSX.Element {
  const { user } = useAuth();
  const { profile, load, loading, error } = useProfile();
  const { palette, mode } = useAppearance();
  const isLight = mode === 'light';
  const hasBirthProfile = Boolean(profile?.birthProfile && profile.natalChart);
  const trackedStart = useRef(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (trackedStart.current) return;
    trackedStart.current = true;
    void track('onboarding_started', { hasBirthProfile });
  }, [hasBirthProfile]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={[styles.brand, { color: isLight ? palette.accent : colors.gold }]}>{BRAND_COPY.mark}</Text>
        <Text style={[styles.title, { color: palette.text }]}>{ONBOARDING_COPY.welcomeTitle}</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          {user?.fullName ? `${firstName(user.fullName)}, ` : ''}{ONBOARDING_COPY.welcomeSubtitle}
        </Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={[styles.loadingText, { color: palette.textMuted }]}>{skyMappingStep(0)}</Text>
          </View>
        ) : null}

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <View style={styles.cardList}>
          {hasBirthProfile && profile?.natalChart ? (
            <>
              <View style={[styles.revealHero, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
                <Text style={[styles.revealEyebrow, { color: colors.gold }]}>Your first sky map</Text>
                <Text style={[styles.revealTitle, { color: palette.text }]}>Your chart is anchored to the real sky.</Text>
                <Text style={[styles.revealBody, { color: palette.textMuted }]}>
                  {whyBirthplaceMatters(profile.birthProfile?.birthCity)}
                </Text>
              </View>
              {buildNatalRevealCards(profile.natalChart).map((card) => (
                <InsightCard
                  key={card.label}
                  label={card.label}
                  title={card.title}
                  body={card.body}
                  palette={palette}
                  isLight={isLight}
                />
              ))}
            </>
          ) : null}
          {CARDS.map((card, index) => (
            <View key={card.title} style={[styles.card, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
              <Text style={[styles.cardNumber, { color: colors.gold }]}>{index + 1}</Text>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, { color: palette.text }]}>{card.title}</Text>
                <Text style={[styles.cardBody, { color: palette.textMuted }]}>{card.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.statusBox,
            {
              borderColor: hasBirthProfile ? 'rgba(123, 191, 106, 0.55)' : 'rgba(229, 115, 115, 0.45)',
              backgroundColor: hasBirthProfile ? 'rgba(123, 191, 106, 0.12)' : 'rgba(229, 115, 115, 0.12)',
            },
          ]}
        >
          <Text style={[styles.statusTitle, { color: palette.text }]}>
            {hasBirthProfile ? ONBOARDING_COPY.chartReadyTitle : ONBOARDING_COPY.chartNeedsTitle}
          </Text>
          <Text style={[styles.statusBody, { color: palette.textMuted }]}>
            {hasBirthProfile
              ? ONBOARDING_COPY.chartReadyBody
              : ONBOARDING_COPY.chartNeedsBody}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => void onComplete(hasBirthProfile)}
            accessibilityRole="button"
            accessibilityLabel="Continue to today's sky"
            hitSlop={hitSlopComfortable}
          >
            <Text style={styles.primaryText}>Enter today's sky</Text>
          </Pressable>
        </View>
        <LegalLinks compact />
      </View>
    </SafeAreaView>
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function InsightCard({
  label,
  title,
  body,
  palette,
  isLight,
}: {
  label: string;
  title: string;
  body: string;
  palette: { text: string; textMuted: string; border: string; surface: string };
  isLight: boolean;
}): React.JSX.Element {
  return (
    <View style={[styles.insightCard, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
      <Text style={[styles.insightLabel, { color: colors.gold }]}>{label}</Text>
      <Text style={[styles.insightTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.insightBody, { color: palette.textMuted }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  brand: {
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  loadingText: { fontSize: 13, lineHeight: 18 },
  cardList: { gap: spacing.sm },
  revealHero: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  revealEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  revealTitle: { marginTop: 4, fontSize: 19, lineHeight: 24, fontWeight: '900' },
  revealBody: { marginTop: 5, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  insightCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  insightLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  insightTitle: { marginTop: 3, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  insightBody: { marginTop: 4, fontSize: 13, lineHeight: 19 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardNumber: {
    width: 24,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  cardBody: { marginTop: 3, fontSize: 13, lineHeight: 19 },
  statusBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  statusTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  statusBody: { marginTop: 3, fontSize: 13, lineHeight: 19 },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  primaryButton: {
    flex: 1.15,
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.accent,
  },
  secondaryText: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  primaryText: { color: '#fff', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18, marginBottom: spacing.sm, textAlign: 'center' },
  pressed: { opacity: 0.84 },
});
