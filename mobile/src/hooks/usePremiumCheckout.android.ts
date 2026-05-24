import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useStripePremiumCheckout } from './useStripePremiumCheckout';
import type { UsePremiumCheckoutResult } from './usePremiumCheckout.shared';
import { checkoutDeferredPremiumPlanDisplays } from '../lib/revenueCat/packages';

export type { PremiumCheckoutActions, UpgradeOptions, UsePremiumCheckoutResult } from './usePremiumCheckout.shared';

export function usePremiumCheckout(): UsePremiumCheckoutResult {
  const { user } = useAuth();
  const stripe = useStripePremiumCheckout();
  const premiumPlans = useMemo(
    () =>
      checkoutDeferredPremiumPlanDisplays(
        'Android currently uses Stripe checkout; pricing is resolved by the backend checkout session.',
      ),
    [],
  );

  return useMemo(
    () => ({
      busy: stripe.busy,
      isPremium: Boolean(user?.isPremium),
      message: stripe.message,
      clearMessage: stripe.clearMessage,
      upgrade: stripe.upgrade,
      manageBilling: stripe.manageBilling,
      refreshStatus: stripe.refreshStatus,
      billingProvider: 'stripe',
      purchasesConfigured: true,
      premiumPlans,
      premiumPlansLoading: false,
      premiumPlansError: null,
    }),
    [premiumPlans, stripe, user?.isPremium],
  );
}

export function usesNativeStripeCheckout(): boolean {
  return true;
}
