/**
 * Default entry (web + Vitest). Native iOS/Android use platform-specific files.
 */
import { useMemo } from 'react';
import { usesStripeBilling } from '../lib/billing/platform';
import { checkoutDeferredPremiumPlanDisplays } from '../lib/revenueCat/packages';
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
  const stripePlans = useMemo(
    () => checkoutDeferredPremiumPlanDisplays('Mobile Stripe pricing is resolved by the backend checkout session.'),
    [],
  );

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
      premiumPlans: provider === 'revenuecat' ? revenueCat.premiumPlans : stripePlans,
      premiumPlansLoading: provider === 'revenuecat' ? revenueCat.premiumPlansLoading : false,
      premiumPlansError: provider === 'revenuecat' ? revenueCat.premiumPlansError : null,
    }),
    [
      active,
      provider,
      revenueCat.isPremium,
      revenueCat.premiumPlans,
      revenueCat.premiumPlansError,
      revenueCat.premiumPlansLoading,
      revenueCat.purchasesConfigured,
      stripePlans,
      user?.isPremium,
    ],
  );
}

export function usesNativeStripeCheckout(): boolean {
  return usesStripeBilling();
}
