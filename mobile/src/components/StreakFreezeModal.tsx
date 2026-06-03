import React, { type ReactElement } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSanctuaryTheme } from './home/sanctuaryTheme';
import { spacing } from '../theme';
import { freezesAfterUse } from '../lib/streakFreeze';
import { useI18n } from '../i18n';

const SNOWFLAKE = '❄';

type Props = {
  visible: boolean;
  streakCount: number;
  /** Freezes currently in the user's inventory. */
  freezeCount: number;
  /** Freeze inventory cap (1 for free, premium keeps its existing higher cap). */
  freezeCap: number;
  pending?: boolean;
  error?: string | null;
  onUseFreeze: () => void;
  onDismiss: () => void;
};

/**
 * "Use a Freeze?" prompt shown when an active streak would be lost. Confirming consumes
 * one freeze through the existing daily-completion flow (which preserves the streak), so
 * this component owns no inventory logic — it only surfaces the choice and the remaining
 * count.
 */
export function StreakFreezeModal({
  visible,
  streakCount,
  freezeCount,
  freezeCap,
  pending = false,
  error = null,
  onUseFreeze,
  onDismiss,
}: Props): ReactElement {
  const theme = useSanctuaryTheme();
  const { t } = useI18n();
  const remaining = freezesAfterUse(freezeCount);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.glyphWell, { backgroundColor: theme.surfaceTint, borderColor: theme.cardBorder }]}>
            <Text style={[styles.glyph, { color: theme.lavender }]} allowFontScaling={false}>
              {SNOWFLAKE}
            </Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {t('streak.freezeTitle')}
          </Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            {t('streak.freezeBody', { count: streakCount })}
          </Text>

          <View style={[styles.inventory, { borderColor: theme.cardBorder }]}>
            <Text style={[styles.inventoryCount, { color: theme.mint }]}>
              {t('streak.freezeAvailable', { count: freezeCount, cap: freezeCap })}
            </Text>
            <Text style={[styles.inventoryHint, { color: theme.textSoft }]}>
              {t('streak.freezeRemaining', { count: remaining })}
            </Text>
          </View>

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.lavender },
              pending && styles.disabled,
              pressed && !pending && styles.pressed,
            ]}
            onPress={onUseFreeze}
            disabled={pending}
            accessibilityRole="button"
            accessibilityState={{ disabled: pending, busy: pending }}
            accessibilityLabel={t('streak.freezeConfirm')}
          >
            {pending ? (
              <ActivityIndicator color={theme.hole} />
            ) : (
              <Text style={[styles.primaryText, { color: theme.hole }]}>{t('streak.freezeConfirm')}</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && !pending && styles.pressed]}
            onPress={onDismiss}
            disabled={pending}
            accessibilityRole="button"
            accessibilityLabel={t('streak.freezeDismiss')}
          >
            <Text style={[styles.secondaryText, { color: theme.textMuted }]}>{t('streak.freezeDismiss')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 6, 24, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 26,
    padding: spacing.lg,
    alignItems: 'center',
  },
  glyphWell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  glyph: {
    fontSize: 26,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  inventory: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  inventoryCount: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  inventoryHint: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  error: {
    color: '#ffb5b5',
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButton: {
    alignSelf: 'stretch',
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  primaryText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  secondaryButton: {
    alignSelf: 'stretch',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  secondaryText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
