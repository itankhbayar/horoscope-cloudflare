import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CustomerInfo } from 'react-native-purchases';
import { ApiClientError } from '@astralis/lib/apiClient';
import * as billingMobileService from '../lib/billingMobileService';
import { hasPremiumEntitlement } from '../lib/revenueCat/entitlements';
import {
  configureRevenueCat,
  isRevenueCatReady,
  purchasePlan,
  restorePurchases,
  RevenueCatNotConfiguredError,
} from '../lib/revenueCat/revenueCatService';
import type { RevenueCatPlanId } from '../lib/revenueCat/config';
import { isRevenueCatConfigured } from '../lib/revenueCat/config';
import { PURCHASES_NOT_CONFIGURED_MESSAGE } from '../lib/revenueCat/messages';
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
  const purchasesConfigured = isRevenueCatConfigured();

  const revenueCatPremium = hasPremiumEntitlement(customerInfo);
  const serverPremium = Boolean(user?.isPremium);
  const isPremiumEffective = revenueCatPremium || serverPremium;

  useEffect(() => {
    if (!user?.id || !purchasesConfigured) return;
    void configureRevenueCat(user.id).catch((err) => {
      console.warn('[revenuecat] configure failed', err);
    });
  }, [purchasesConfigured, user?.id]);

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
      await billingMobileService.syncRevenueCatPremium();
      await refreshUser();
      setMessage('Purchases restored and synced with your account.');
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
        const info = await purchasePlan(plan);
        setCustomerInfo(info);
        await billingMobileService.syncRevenueCatPremium();
        await refreshUser();
        setMessage('Premium is active. Enjoy full access.');
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
    setMessage('Open the App Store → Apple ID → Subscriptions to manage your plan.');
  }, [purchasesConfigured]);

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
    }),
    [
      busy,
      clearMessage,
      customerInfo,
      isPremiumEffective,
      manageBilling,
      message,
      purchasesConfigured,
      refreshStatus,
      revenueCatPremium,
      upgrade,
    ],
  );
}
