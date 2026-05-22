import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import * as billingMobileService from '@astralis/lib/billingMobileService';
import { ApiClientError } from '@astralis/lib/apiClient';
import { useAuth } from './useAuth';

const RETURN_PATH = 'stripe-return';

type UpgradeOptions = {
  priceId?: string;
};

export type PremiumCheckoutActions = {
  busy: boolean;
  message: string | null;
  clearMessage: () => void;
  upgrade: (options?: UpgradeOptions) => Promise<void>;
  manageBilling: () => Promise<void>;
  refreshStatus: () => Promise<void>;
};

function hasPublishableKey(): boolean {
  const g = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
  };
  const pk = g.process?.env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return Boolean(pk && pk.length > 0);
}

export function useStripePremiumCheckout(): PremiumCheckoutActions {
  const { refreshUser } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  const refreshStatus = useCallback(async (): Promise<void> => {
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

  const upgrade = useCallback(
    async (options: UpgradeOptions = {}): Promise<void> => {
      setMessage(null);
      if (!hasPublishableKey()) {
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
        const sheet = await billingMobileService.createMobilePremiumCheckout({
          idempotencyKey,
          priceId: options.priceId,
        });
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

        setMessage('Payment submitted. Syncing your account with the server...');
        await refreshUser();
        setMessage('Premium unlocked. If status is delayed, wait a moment and tap "Restore purchases".');
      } catch (e) {
        const msg = e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : 'Checkout failed';
        setMessage(msg);
      } finally {
        setBusy(false);
      }
    },
    [initPaymentSheet, presentPaymentSheet, refreshUser],
  );

  const manageBilling = useCallback(async (): Promise<void> => {
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

  return useMemo(
    () => ({
      busy,
      message,
      clearMessage,
      upgrade,
      manageBilling,
      refreshStatus,
    }),
    [busy, clearMessage, manageBilling, message, refreshStatus, upgrade],
  );
}
