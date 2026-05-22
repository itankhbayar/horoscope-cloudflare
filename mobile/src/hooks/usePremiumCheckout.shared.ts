import type { PremiumCheckoutActions } from './useStripePremiumCheckout';

export type { PremiumCheckoutActions };

export type UpgradeOptions = {
  priceId?: string;
  plan?: 'monthly' | 'yearly';
};

export type UsePremiumCheckoutResult = PremiumCheckoutActions & {
  isPremium: boolean;
  billingProvider: 'revenuecat' | 'stripe';
  /** False on iOS when EXPO_PUBLIC_REVENUECAT_API_KEY_IOS is unset. */
  purchasesConfigured: boolean;
};
