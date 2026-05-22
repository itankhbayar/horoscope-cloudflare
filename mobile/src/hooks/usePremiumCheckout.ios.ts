import { useMemo } from 'react';
import { useRevenueCatPremium } from './useRevenueCatPremium';
import type { UsePremiumCheckoutResult } from './usePremiumCheckout.shared';

export type { PremiumCheckoutActions, UpgradeOptions, UsePremiumCheckoutResult } from './usePremiumCheckout.shared';

export function usePremiumCheckout(): UsePremiumCheckoutResult {
  const revenueCat = useRevenueCatPremium();

  return useMemo(
    () => ({
      busy: revenueCat.busy,
      isPremium: revenueCat.isPremium,
      message: revenueCat.message,
      clearMessage: revenueCat.clearMessage,
      upgrade: revenueCat.upgrade,
      manageBilling: revenueCat.manageBilling,
      refreshStatus: revenueCat.refreshStatus,
      billingProvider: 'revenuecat',
      purchasesConfigured: revenueCat.purchasesConfigured,
    }),
    [revenueCat],
  );
}

export function usesNativeStripeCheckout(): boolean {
  return false;
}
