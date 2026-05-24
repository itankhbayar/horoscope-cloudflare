import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LegalLinks } from '../components/LegalLinks';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { track } from '../lib/analytics';
import { colors, hitSlopComfortable, MIN_TOUCH, spacing } from '../theme';
import { useAppearance } from '../hooks/useAppearance';

type Props = {
  onComplete: (hasBirthProfile: boolean) => Promise<void>;
};

const CARDS = [
  {
    title: 'Your chart is the home base',
    body: 'Birth date, time, city, and timezone feed the daily dashboard, chart placements, and compatibility readings.',
  },
  {
    title: 'Daily guidance starts simple',
    body: 'Home gives today first. Premium previews show what deeper timing, tarot, compatibility, and chart layers unlock.',
  },
  {
    title: 'Notifications stay opt-in',
    body: 'You can enable daily horoscope reminders later from Profile. If push is not configured, the app explains why.',
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
        <Text style={[styles.brand, { color: isLight ? palette.accent : colors.gold }]}>✦ Astralis</Text>
        <Text style={[styles.title, { color: palette.text }]}>Welcome{user?.fullName ? `, ${firstName(user.fullName)}` : ''}</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          A quick setup pass before you land in the dashboard.
        </Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={[styles.loadingText, { color: palette.textMuted }]}>Checking your birth profile...</Text>
          </View>
        ) : null}

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <View style={styles.cardList}>
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
            {hasBirthProfile ? 'Birth profile ready' : 'Birth profile needs attention'}
          </Text>
          <Text style={[styles.statusBody, { color: palette.textMuted }]}>
            {hasBirthProfile
              ? 'Your natal chart is available. You can refine account details later from Profile.'
              : 'The app can still open, but registration or backend profile editing needs work before this is launch-ready.'}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => void onComplete(hasBirthProfile)}
            accessibilityRole="button"
            accessibilityLabel="Continue to dashboard"
            hitSlop={hitSlopComfortable}
          >
            <Text style={styles.primaryText}>Go to dashboard</Text>
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
