import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useStripePremiumCheckout } from './useStripePremiumCheckout';
import type { UsePremiumCheckoutResult } from './usePremiumCheckout.shared';

export type { PremiumCheckoutActions, UpgradeOptions, UsePremiumCheckoutResult } from './usePremiumCheckout.shared';

export function usePremiumCheckout(): UsePremiumCheckoutResult {
  const { user } = useAuth();
  const stripe = useStripePremiumCheckout();

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
    }),
    [stripe, user?.isPremium],
  );
}

export function usesNativeStripeCheckout(): boolean {
  return true;
}
