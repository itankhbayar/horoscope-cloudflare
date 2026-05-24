import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CosmicCard } from './CosmicCard';
import { bodyFontSize, bodyLineHeight, colors, hitSlopComfortable, MIN_TOUCH, spacing } from '../theme';
import { useAppearance } from '../hooks/useAppearance';
import { usePremiumCheckout } from '../hooks/usePremiumCheckout';
import { usesRevenueCatBilling } from '../lib/billing/platform';
import { goToPremium } from '../navigation/navigationRef';
import { track } from '../lib/analytics';

export function PremiumAccessCard(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { palette } = useAppearance();
  const { busy, isPremium, message, upgrade, manageBilling, refreshStatus, purchasesConfigured } =
    usePremiumCheckout();
  const isIosIap = usesRevenueCatBilling();
  const purchasesUnavailable = isIosIap && !purchasesConfigured;

  const bodySize = useMemo(() => bodyFontSize(width), [width]);
  const lineHeight = useMemo(() => bodyLineHeight(width), [width]);
  const onUpgrade = useCallback(() => {
    void track('paywall_viewed', { source: 'profile_card' });
    goToPremium('profile_card');
  }, []);
  const onManageBilling = useCallback(() => void manageBilling(), [manageBilling]);
  const onRefreshStatus = useCallback(() => void refreshStatus(), [refreshStatus]);

  const bodyCopy = purchasesUnavailable
    ? 'Purchases are not configured yet. Premium sky layers will unlock after Apple in-app purchase setup is complete.'
    : isIosIap
      ? 'Open deeper chart intelligence with your Apple ID, manage in App Store Subscriptions, or restore purchases on a new device.'
      : 'Open deeper chart intelligence with secure checkout, manage billing, or restore your entitlement from the server.';

  const upgradeLabel = purchasesUnavailable
    ? 'Purchases not configured'
    : isPremium
      ? isIosIap
        ? 'Manage in App Store'
        : 'Extend or update payment'
      : isIosIap
        ? 'Subscribe with Apple'
        : 'Upgrade with Stripe';

  return (
    <CosmicCard title="Astralis Sky Intelligence">
      <View
        style={[
          styles.planStatus,
          isPremium ? styles.planStatusActive : styles.planStatusFree,
          { borderColor: palette.border },
        ]}
      >
        <Text style={[styles.statusLabel, { color: palette.textMuted }]}>Current plan</Text>
        <Text style={[styles.statusValue, { color: palette.text }]}>{isPremium ? 'Deeper sky layers active' : 'Core sky ritual'}</Text>
      </View>
      <Text style={[styles.body, { fontSize: bodySize, lineHeight, color: palette.textMuted }]}>{bodyCopy}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: palette.accent },
          busy && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={onUpgrade}
        disabled={busy || purchasesUnavailable}
        accessibilityRole="button"
        accessibilityLabel={isIosIap ? 'Subscribe to premium with Apple' : 'Upgrade to premium with Stripe'}
        accessibilityState={{ disabled: busy }}
        hitSlop={hitSlopComfortable}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>{upgradeLabel}</Text>
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: palette.border },
          busy && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={onManageBilling}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={
          isIosIap ? 'How to manage subscription in the App Store' : 'Manage subscription in Stripe customer portal'
        }
        hitSlop={hitSlopComfortable}
      >
        <Text style={[styles.secondaryText, { color: palette.accent }]}>
          {isIosIap ? 'Manage subscription (App Store)' : 'Manage billing (portal)'}
        </Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: palette.border },
          busy && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={onRefreshStatus}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={isIosIap ? 'Restore App Store purchases' : 'Refresh premium status from server'}
        hitSlop={hitSlopComfortable}
      >
        <Text style={[styles.secondaryText, { color: palette.accent }]}>
          {isIosIap ? 'Restore purchases' : 'Restore / refresh status'}
        </Text>
      </Pressable>

      {message ? (
        <Text style={[styles.feedback, { color: palette.text }]} accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
    </CosmicCard>
  );
}

const styles = StyleSheet.create({
  planStatus: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  planStatusActive: {
    backgroundColor: 'rgba(102, 78, 236, 0.36)',
  },
  planStatusFree: {
    backgroundColor: 'rgba(42, 30, 90, 0.25)',
  },
  statusLabel: {
    fontSize: 12,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusValue: { fontWeight: '700', fontSize: 16 },
  body: { color: colors.textMuted },
  primary: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    marginTop: spacing.sm,
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondaryText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.88 },
  feedback: { marginTop: spacing.md, color: colors.text, fontSize: 15, lineHeight: 22 },
});
