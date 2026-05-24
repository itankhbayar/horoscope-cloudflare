import type { PremiumCheckoutActions } from './useStripePremiumCheckout';
import type { PremiumPlanDisplay } from '../lib/revenueCat/packages';

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
  premiumPlans: PremiumPlanDisplay[];
  premiumPlansLoading: boolean;
  premiumPlansError: string | null;
};
