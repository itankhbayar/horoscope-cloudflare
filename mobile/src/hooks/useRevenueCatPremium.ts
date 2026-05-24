import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CustomerInfo } from 'react-native-purchases';
import { Linking, Platform } from 'react-native';
import { ApiClientError } from '@astralis/lib/apiClient';
import * as billingMobileService from '../lib/billingMobileService';
import { hasPremiumEntitlement } from '../lib/revenueCat/entitlements';
import {
  configureRevenueCat,
  getPremiumPlanDisplays,
  isRevenueCatReady,
  purchasePlan,
  restorePurchases,
  RevenueCatNotConfiguredError,
} from '../lib/revenueCat/revenueCatService';
import type { RevenueCatPlanId } from '../lib/revenueCat/config';
import { isRevenueCatConfigured } from '../lib/revenueCat/config';
import { PURCHASES_NOT_CONFIGURED_MESSAGE } from '../lib/revenueCat/messages';
import {
  APPLE_SUBSCRIPTIONS_DEEP_LINK,
  APPLE_SUBSCRIPTIONS_WEB_URL,
  buildPlaySubscriptionManagementUrl,
  getAndroidPackageName,
} from '../lib/billing/subscriptionLinks';
import {
  fallbackPremiumPlanDisplays,
  pickManageSubscriptionProductId,
  type PremiumPlanDisplay,
} from '../lib/revenueCat/packages';
import { track } from '../lib/analytics';
import { useAuth } from './useAuth';
import type { PremiumCheckoutActions } from './useStripePremiumCheckout';

type UpgradeOptions = {
  priceId?: string;
  plan?: RevenueCatPlanId;
};

export type RevenueCatPremiumCheckout = PremiumCheckoutActions & {
  isPremium: boolean;
  revenueCatPremium: boolean;
  customerInfo: CustomerInfo | null;
  purchasesConfigured: boolean;
  premiumPlans: PremiumPlanDisplay[];
  premiumPlansLoading: boolean;
  premiumPlansError: string | null;
};

function planFromOptions(options: UpgradeOptions): RevenueCatPlanId {
  if (options.plan) return options.plan;
  if (options.priceId?.toLowerCase().includes('year')) return 'yearly';
  return 'monthly';
}

function isNotConfiguredError(e: unknown): boolean {
  return e instanceof RevenueCatNotConfiguredError;
}

export function useRevenueCatPremium(): RevenueCatPremiumCheckout {
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [premiumPlans, setPremiumPlans] = useState<PremiumPlanDisplay[]>(
    fallbackPremiumPlanDisplays('RevenueCat offerings have not loaded yet.'),
  );
  const [premiumPlansLoading, setPremiumPlansLoading] = useState(false);
  const [premiumPlansError, setPremiumPlansError] = useState<string | null>(null);
  const purchasesConfigured = isRevenueCatConfigured();

  const revenueCatPremium = hasPremiumEntitlement(customerInfo);
  const serverPremium = Boolean(user?.isPremium);
  const isPremiumEffective = revenueCatPremium || serverPremium;

  useEffect(() => {
    if (!user?.id || !purchasesConfigured) return;
    let alive = true;
    setPremiumPlansLoading(true);
    setPremiumPlansError(null);
    void configureRevenueCat(user.id)
      .then(() => getPremiumPlanDisplays())
      .then((plans) => {
        if (!alive) return;
        setPremiumPlans(plans);
      })
      .catch((err) => {
        if (!alive) return;
        const msg = err instanceof Error ? err.message : 'Could not load RevenueCat offerings.';
        console.warn('[revenuecat] configure or offerings failed', msg);
        setPremiumPlans(fallbackPremiumPlanDisplays(msg));
        setPremiumPlansError(msg);
      })
      .finally(() => {
        if (alive) setPremiumPlansLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [purchasesConfigured, user?.id]);

  useEffect(() => {
    if (purchasesConfigured) return;
    setPremiumPlans(fallbackPremiumPlanDisplays('RevenueCat is not configured for this build.'));
    setPremiumPlansLoading(false);
    setPremiumPlansError(PURCHASES_NOT_CONFIGURED_MESSAGE);
  }, [purchasesConfigured]);

  useEffect(() => {
    if (!isRevenueCatReady()) return;
    let remove: (() => void) | undefined;
    void (async () => {
      try {
        const Purchases = (await import('react-native-purchases')).default;
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        const unsubscribe = Purchases.addCustomerInfoUpdateListener((next) => {
          setCustomerInfo(next);
        });
        if (typeof unsubscribe === 'function') {
          remove = unsubscribe;
        }
      } catch (err) {
        console.warn('[revenuecat] customer info listener failed', err);
      }
    })();
    return () => {
      remove?.();
    };
  }, [purchasesConfigured, user?.id]);

  const clearMessage = useCallback(() => setMessage(null), []);

  const refreshStatus = useCallback(async (): Promise<void> => {
    setMessage(null);
    if (!purchasesConfigured) {
      setMessage(PURCHASES_NOT_CONFIGURED_MESSAGE);
      return;
    }

    setBusy(true);
    try {
      const info = await restorePurchases();
      setCustomerInfo(info);
      const sync = await billingMobileService.syncRevenueCatPremium();
      await refreshUser();
      void track('subscription_restored', { provider: 'revenuecat', active: sync.isPremium });
      if (sync.isPremium) {
        void track('premium_purchased', { provider: 'revenuecat', source: 'restore_sync' });
      }
      setMessage(
        sync.isPremium
          ? 'Purchases restored and synced with your account.'
          : 'Restore completed, but Premium is not active for this account yet.',
      );
    } catch (e) {
      if (isNotConfiguredError(e)) {
        setMessage(PURCHASES_NOT_CONFIGURED_MESSAGE);
        return;
      }
      if (e instanceof ApiClientError && e.status === 503) {
        setMessage(PURCHASES_NOT_CONFIGURED_MESSAGE);
        return;
      }
      setMessage(e instanceof Error ? e.message : 'Could not restore purchases');
    } finally {
      setBusy(false);
    }
  }, [purchasesConfigured, refreshUser]);

  const upgrade = useCallback(
    async (options: UpgradeOptions = {}): Promise<void> => {
      setMessage(null);
      if (!purchasesConfigured) {
        setMessage(PURCHASES_NOT_CONFIGURED_MESSAGE);
        return;
      }

      setBusy(true);
      try {
        const plan = planFromOptions(options);
        void track('checkout_started', { provider: 'revenuecat', plan });
        const info = await purchasePlan(plan);
        setCustomerInfo(info);
        const sync = await billingMobileService.syncRevenueCatPremium();
        await refreshUser();
        if (sync.isPremium) {
          void track('premium_purchased', { provider: 'revenuecat', source: 'purchase_sync' });
        }
        setMessage(
          sync.isPremium
            ? 'Premium is active. Enjoy full access.'
            : 'Purchase completed, but Premium is still syncing. Tap Restore purchases in a moment.',
        );
      } catch (e) {
        if (isNotConfiguredError(e)) {
          setMessage(PURCHASES_NOT_CONFIGURED_MESSAGE);
          return;
        }
        if (e instanceof ApiClientError && e.status === 503) {
          setMessage(PURCHASES_NOT_CONFIGURED_MESSAGE);
          return;
        }
        const err = e as { userCancelled?: boolean; message?: string };
        if (err.userCancelled) {
          setMessage('Purchase canceled.');
        } else {
          setMessage(err.message ?? 'Purchase failed');
        }
      } finally {
        setBusy(false);
      }
    },
    [purchasesConfigured, refreshUser],
  );

  const manageBilling = useCallback(async (): Promise<void> => {
    if (!purchasesConfigured) {
      setMessage(PURCHASES_NOT_CONFIGURED_MESSAGE);
      return;
    }
    setMessage(null);

    try {
      if (Platform.OS === 'ios') {
        if (await Linking.canOpenURL(APPLE_SUBSCRIPTIONS_DEEP_LINK)) {
          await Linking.openURL(APPLE_SUBSCRIPTIONS_DEEP_LINK);
          return;
        }
        if (await Linking.canOpenURL(APPLE_SUBSCRIPTIONS_WEB_URL)) {
          await Linking.openURL(APPLE_SUBSCRIPTIONS_WEB_URL);
          return;
        }
        setMessage('Open Settings, tap your Apple ID, then Subscriptions to manage Premium.');
        return;
      }

      if (Platform.OS === 'android') {
        const url = buildPlaySubscriptionManagementUrl({
          packageName: getAndroidPackageName(),
          productId: pickManageSubscriptionProductId(premiumPlans),
        });
        if (!url) {
          setMessage('Open Google Play, tap your profile, then Payments & subscriptions to manage Premium.');
          return;
        }
        if (!(await Linking.canOpenURL(url))) {
          setMessage('Google Play subscription management could not open on this device.');
          return;
        }
        await Linking.openURL(url);
        return;
      }

      setMessage('Manage Premium from the store account used to subscribe on your mobile device.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not open subscription management.');
    }
  }, [premiumPlans, purchasesConfigured]);

  return useMemo(
    () => ({
      busy,
      message,
      clearMessage,
      upgrade,
      manageBilling,
      refreshStatus,
      revenueCatPremium,
      customerInfo,
      isPremium: isPremiumEffective,
      purchasesConfigured,
      premiumPlans,
      premiumPlansLoading,
      premiumPlansError,
    }),
    [
      busy,
      clearMessage,
      customerInfo,
      isPremiumEffective,
      manageBilling,
      message,
      premiumPlans,
      premiumPlansError,
      premiumPlansLoading,
      purchasesConfigured,
      refreshStatus,
      revenueCatPremium,
      upgrade,
    ],
  );
}
