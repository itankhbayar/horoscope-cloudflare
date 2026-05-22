/**
 * Default entry (web + Vitest). Native iOS/Android use platform-specific files.
 */
import { useMemo } from 'react';
import { usesStripeBilling } from '../lib/billing/platform';
import { useAuth } from './useAuth';
import { useRevenueCatPremium } from './useRevenueCatPremium';
import { useStripePremiumCheckout } from './useStripePremiumCheckout';
import type { UsePremiumCheckoutResult } from './usePremiumCheckout.shared';

export type { PremiumCheckoutActions, UpgradeOptions, UsePremiumCheckoutResult } from './usePremiumCheckout.shared';

export function usePremiumCheckout(): UsePremiumCheckoutResult {
  const revenueCat = useRevenueCatPremium();
  const stripe = useStripePremiumCheckout();
  const { user } = useAuth();
  const provider = usesStripeBilling() ? 'stripe' : 'revenuecat';
  const active = provider === 'revenuecat' ? revenueCat : stripe;

  return useMemo(
    () => ({
      busy: active.busy,
      isPremium: provider === 'revenuecat' ? revenueCat.isPremium : Boolean(user?.isPremium),
      message: active.message,
      clearMessage: active.clearMessage,
      upgrade: active.upgrade,
      manageBilling: active.manageBilling,
      refreshStatus: active.refreshStatus,
      billingProvider: provider,
      purchasesConfigured: provider === 'revenuecat' ? revenueCat.purchasesConfigured : true,
    }),
    [active, provider, revenueCat.isPremium, revenueCat.purchasesConfigured, user?.isPremium],
  );
}

export function usesNativeStripeCheckout(): boolean {
  return usesStripeBilling();
}
