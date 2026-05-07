import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import * as billingMobileService from '@astralis/lib/billingMobileService';
import { ApiClientError } from '@astralis/lib/apiClient';
import { CosmicCard } from '../components/CosmicCard';
import { useAuth } from '../hooks/useAuth';
import {
  bodyFontSize,
  bodyLineHeight,
  colors,
  hitSlopComfortable,
  horizontalScreenPadding,
  MIN_TOUCH,
  screenTitleSize,
  spacing,
} from '../theme';
import { useAppearance } from '../hooks/useAppearance';

const RETURN_PATH = 'stripe-return';

export function PremiumScreen(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { palette } = useAppearance();
  const { user, refreshUser } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hp = horizontalScreenPadding(width);
  const titleSize = screenTitleSize(width);
  const bodySize = bodyFontSize(width);
  const lh = bodyLineHeight(width);

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
        if (result.error.code === 'Canceled') {
          setMessage('Checkout canceled.');
        } else {
          setMessage(result.error.message);
        }
        return;
      }

      setMessage('Payment submitted. Syncing your account with the server…');
      await refreshUser();
      setMessage(
        'Thank you! If Premium does not show yet, wait a few seconds for Stripe webhooks then tap “Restore / refresh status”.',
      );
    } catch (e) {
      const msg =
        e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : 'Checkout failed';
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
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: hp, paddingTop: spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontSize: titleSize, color: palette.text }]} accessibilityRole="header">
          Premium
        </Text>

        <CosmicCard title="Your plan">
          <Text style={[styles.body, { fontSize: bodySize, lineHeight: lh, color: palette.textMuted }]}>
            Status:{' '}
            <Text style={[styles.statusStrong, { color: palette.text }]}>{isPremium ? 'Premium active' : 'Free plan'}</Text>
          </Text>
          {user ? (
            <Text style={[styles.muted, { fontSize: bodySize - 1, color: palette.textMuted }]}>
              Signed in as {user.fullName}. Entitlements always come from the server after Stripe webhooks
              confirm payment.
            </Text>
          ) : null}
        </CosmicCard>

        <CosmicCard title="Upgrade">
          <Text style={[styles.body, { fontSize: bodySize, lineHeight: lh, color: palette.textMuted }]}>
            Pay with Apple Pay / Google Pay or card via Stripe (test mode). The app never trusts the device
            alone—your account updates when Stripe notifies the backend.
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
        </CosmicCard>

        <CosmicCard title="Manage & restore">
          <Text style={[styles.body, { fontSize: bodySize, lineHeight: lh, marginBottom: spacing.sm }]}>
            Open the Stripe customer portal to update cards or cancel. Use restore to re-fetch entitlement
            from the API (e.g. after webhook delay or reinstall).
          </Text>
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
        </CosmicCard>

        {message ? (
          <Text style={[styles.feedback, { color: palette.text }]} accessibilityLiveRegion="polite">
            {message}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: spacing.xxxl },
  title: { fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  body: { color: colors.textMuted },
  muted: { color: colors.textMuted, marginTop: spacing.sm },
  statusStrong: { color: colors.text, fontWeight: '700' },
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
