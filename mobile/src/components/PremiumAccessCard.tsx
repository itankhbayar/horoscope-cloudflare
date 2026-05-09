import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import * as billingMobileService from '@astralis/lib/billingMobileService';
import { ApiClientError } from '@astralis/lib/apiClient';
import { CosmicCard } from './CosmicCard';
import { useAuth } from '../hooks/useAuth';
import { bodyFontSize, bodyLineHeight, colors, hitSlopComfortable, MIN_TOUCH, spacing } from '../theme';
import { useAppearance } from '../hooks/useAppearance';

const RETURN_PATH = 'stripe-return';

export function PremiumAccessCard(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { palette } = useAppearance();
  const { user, refreshUser } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const bodySize = useMemo(() => bodyFontSize(width), [width]);
  const lineHeight = useMemo(() => bodyLineHeight(width), [width]);
  const isPremium = Boolean(user?.isPremium);

  const readPublishableKey = useCallback((): boolean => {
    const g = globalThis as unknown as {
      process?: { env?: Record<string, string | undefined> };
    };
    const pk = g.process?.env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
    return Boolean(pk && pk.length > 0);
  }, []);

  const onRefreshStatus = useCallback(async (): Promise<void> => {
    setMessage(null);
    setBusy(true);
    try {
      await billingMobileService.restoreMobilePremiumStatus();
      await refreshUser();
      setMessage('Subscription status refreshed from the server.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not refresh status');
    } finally {
      setBusy(false);
    }
  }, [refreshUser]);

  const onUpgrade = useCallback(async (): Promise<void> => {
    setMessage(null);
    if (!readPublishableKey()) {
      Alert.alert(
        'Stripe not configured',
        'Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to mobile/.env (test publishable key) and restart Expo.',
      );
      return;
    }
    setBusy(true);
    const idempotencyKey =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `mobile-${Date.now()}`;

    try {
      const sheet = await billingMobileService.createMobilePremiumCheckout({ idempotencyKey });
      const baseSheet = {
        merchantDisplayName: 'Astralis',
        returnURL: `astralis://${RETURN_PATH}`,
        allowsDelayedPaymentMethods: true,
      } as const;

      const init =
        sheet.mode === 'subscription'
          ? await initPaymentSheet({
              ...baseSheet,
              paymentIntentClientSecret: sheet.paymentIntentClientSecret,
              customerEphemeralKeySecret: sheet.customerEphemeralKeySecret,
              customerId: sheet.customerId,
            })
          : await initPaymentSheet({
              ...baseSheet,
              paymentIntentClientSecret: sheet.paymentIntentClientSecret,
            });

      if (init.error) {
        setMessage(init.error.message);
        return;
      }

      const result = await presentPaymentSheet();
      if (result.error) {
        setMessage(result.error.code === 'Canceled' ? 'Checkout canceled.' : result.error.message);
        return;
      }

      setMessage('Payment submitted. Syncing your account with the server…');
      await refreshUser();
      setMessage('Premium unlocked. If status is delayed, wait a moment and tap "Restore / refresh status".');
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : 'Checkout failed';
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }, [initPaymentSheet, presentPaymentSheet, readPublishableKey, refreshUser]);

  const onManageBilling = useCallback(async (): Promise<void> => {
    setMessage(null);
    const returnUrl = `astralis://${RETURN_PATH}`;
    setBusy(true);
    try {
      const { url } = await billingMobileService.createMobileBillingPortalSession(returnUrl);
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        setMessage('Cannot open billing portal URL on this device.');
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not open billing portal';
      if (e instanceof ApiClientError && e.status === 409) {
        Alert.alert('Billing portal', msg);
      } else {
        setMessage(msg);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <CosmicCard title="Premium">
      <View style={[styles.planStatus, { borderColor: palette.border }]}>
        <Text style={[styles.statusLabel, { color: palette.textMuted }]}>Current plan</Text>
        <Text style={[styles.statusValue, { color: palette.text }]}>{isPremium ? 'Premium active' : 'Free plan'}</Text>
      </View>
      <Text style={[styles.body, { fontSize: bodySize, lineHeight, color: palette.textMuted }]}>
        Upgrade with Stripe, manage billing, or restore your entitlement from the server.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.primary, { backgroundColor: palette.accent }, busy && styles.disabled, pressed && styles.pressed]}
        onPress={() => void onUpgrade()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Upgrade to premium with Stripe"
        accessibilityState={{ disabled: busy }}
        hitSlop={hitSlopComfortable}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>{isPremium ? 'Extend or update payment' : 'Upgrade with Stripe'}</Text>
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.secondary, { borderColor: palette.border }, busy && styles.disabled, pressed && styles.pressed]}
        onPress={() => void onManageBilling()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Manage subscription in Stripe customer portal"
        hitSlop={hitSlopComfortable}
      >
        <Text style={[styles.secondaryText, { color: palette.accent }]}>Manage billing (portal)</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.secondary, { borderColor: palette.border }, busy && styles.disabled, pressed && styles.pressed]}
        onPress={() => void onRefreshStatus()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Refresh premium status from server"
        hitSlop={hitSlopComfortable}
      >
        <Text style={[styles.secondaryText, { color: palette.accent }]}>Restore / refresh status</Text>
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
    backgroundColor: 'rgba(42, 30, 90, 0.35)',
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
