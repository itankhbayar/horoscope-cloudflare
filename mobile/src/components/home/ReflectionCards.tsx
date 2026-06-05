import React, { type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSanctuaryTheme } from './sanctuaryTheme';
import { spacing } from '../../theme';
import { useI18n } from '../../i18n';

/**
 * Accuracy Loop — morning beat. Shows the server-selected acknowledgment of how
 * yesterday's reading landed, atop today's reading. Visible loop-closer.
 */
export function ReflectionAckCard({ text }: { text: string }): ReactElement {
  const theme = useSanctuaryTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.ack, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}>
      <Text style={[styles.ackEyebrow, { color: theme.lavender }]}>{t('reflection.ackEyebrow')}</Text>
      <Text style={[styles.ackText, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

/**
 * Accuracy Loop — evening beat. Surfaced when the user has revealed today's reading
 * but not yet checked in. Taps through to the check-in screen.
 */
export function EveningCheckInCard({ onPress }: { onPress: () => void }): ReactElement {
  const theme = useSanctuaryTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.evening, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}>
      <Text style={[styles.eveningTitle, { color: theme.text }]}>{t('reflection.eveningTitle')}</Text>
      <Text style={[styles.eveningBody, { color: theme.textMuted }]}>{t('reflection.eveningBody')}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.eveningCta, { backgroundColor: theme.lavender }, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t('reflection.eveningCta')}
      >
        <Text style={[styles.eveningCtaText, { color: theme.hole }]}>{t('reflection.eveningCta')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ack: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  ackEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  ackText: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  evening: {
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  eveningTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
  },
  eveningBody: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  eveningCta: {
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  eveningCtaText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
