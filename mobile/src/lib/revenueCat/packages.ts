import type { PurchasesPackage } from 'react-native-purchases';
import { packageIdentifierForPlan, type RevenueCatPlanId } from './config';
import { findPackageByIdentifier } from './entitlements';

export type PremiumPlanDisplay = {
  id: RevenueCatPlanId;
  title: string;
  packageIdentifier: string;
  productIdentifier: string | null;
  price: string;
  cadence: string;
  note: string;
  badge?: string;
  bestValue?: boolean;
  available: boolean;
  unavailableReason?: string;
  /** True only when the store product actually carries a free-trial introductory offer. */
  hasTrial: boolean;
  /** Free-trial length in days when known (from the store intro offer), else null. */
  trialDays: number | null;
};

/**
 * Reads a free-trial introductory offer straight from the store product. A free trial is an
 * intro price of 0; we never invent trial availability — if the store product has no zero-price
 * intro offer, `hasTrial` is false and the paywall keeps normal premium copy.
 */
export function trialFromProduct(product: PurchasesPackage['product']): {
  hasTrial: boolean;
  trialDays: number | null;
} {
  const intro = product.introPrice;
  if (!intro || intro.price !== 0) return { hasTrial: false, trialDays: null };
  const units = intro.periodNumberOfUnits;
  switch (intro.periodUnit) {
    case 'DAY':
      return { hasTrial: true, trialDays: units };
    case 'WEEK':
      return { hasTrial: true, trialDays: units * 7 };
    case 'MONTH':
      return { hasTrial: true, trialDays: units * 30 };
    case 'YEAR':
      return { hasTrial: true, trialDays: units * 365 };
    default:
      return { hasTrial: true, trialDays: null };
  }
}

const PLAN_COPY: Record<RevenueCatPlanId, Pick<PremiumPlanDisplay, 'title' | 'cadence' | 'note' | 'badge' | 'bestValue'>> = {
  monthly: {
    title: 'Monthly',
    cadence: 'per month',
    note: 'Best when you want to test a month of deeper timing and pattern memory.',
  },
  yearly: {
    title: 'Yearly',
    cadence: 'per year',
    note: 'Best for building a full archive of daily sky, tarot, and relationship patterns.',
    badge: 'Best value',
    bestValue: true,
  },
};

const PLAN_ORDER: RevenueCatPlanId[] = ['monthly', 'yearly'];

function unavailablePlan(id: RevenueCatPlanId, reason: string): PremiumPlanDisplay {
  const packageIdentifier = packageIdentifierForPlan(id);
  return {
    id,
    ...PLAN_COPY[id],
    packageIdentifier,
    productIdentifier: null,
    price: 'Unavailable',
    available: false,
    unavailableReason: reason,
    hasTrial: false,
    trialDays: null,
  };
}

function planFromPackage(id: RevenueCatPlanId, pkg: PurchasesPackage): PremiumPlanDisplay {
  const product = pkg.product;
  const price = product.priceString?.trim();
  const yearlyMonthPrice = id === 'yearly' ? product.pricePerMonthString?.trim() : undefined;
  const trial = trialFromProduct(product);
  return {
    id,
    ...PLAN_COPY[id],
    packageIdentifier: pkg.identifier,
    productIdentifier: product.identifier ?? null,
    price: price && price.length > 0 ? price : 'Price unavailable',
    note:
      id === 'yearly' && yearlyMonthPrice
        ? `${yearlyMonthPrice} per month, billed yearly.`
        : PLAN_COPY[id].note,
    available: Boolean(price && price.length > 0),
    unavailableReason: price && price.length > 0 ? undefined : 'Store price is missing from RevenueCat.',
    hasTrial: trial.hasTrial,
    trialDays: trial.trialDays,
  };
}

export function buildPremiumPlanDisplays(packages: PurchasesPackage[]): PremiumPlanDisplay[] {
  if (packages.length === 0) {
    return PLAN_ORDER.map((id) => unavailablePlan(id, 'RevenueCat returned no packages for the active offering.'));
  }

  return PLAN_ORDER.map((id) => {
    const packageIdentifier = packageIdentifierForPlan(id);
    const pkg = findPackageByIdentifier(packages, packageIdentifier);
    if (!pkg) {
      return unavailablePlan(id, `Missing RevenueCat package "${packageIdentifier}" in the active offering.`);
    }
    return planFromPackage(id, pkg);
  });
}

export function fallbackPremiumPlanDisplays(reason: string): PremiumPlanDisplay[] {
  return PLAN_ORDER.map((id) => unavailablePlan(id, reason));
}

export function checkoutDeferredPremiumPlanDisplays(reason: string): PremiumPlanDisplay[] {
  return PLAN_ORDER.map((id) => ({
    id,
    ...PLAN_COPY[id],
    packageIdentifier: '',
    productIdentifier: null,
    price: 'Calculated at checkout',
    available: true,
    unavailableReason: reason,
    /**
     * Mobile Stripe (Android) subscriptions always include the backend-enforced 7-day trial,
     * so deferred-pricing plans advertise the trial. RevenueCat plans instead read the real
     * store intro offer in `planFromPackage`.
     */
    hasTrial: true,
    trialDays: 7,
  }));
}

export type PremiumCtaLabelKey = 'premium.activeCta' | 'premium.trialCta' | 'premium.cta';

/**
 * i18n key for the paywall CTA. Trial copy ("7 хоног үнэгүй туршаад үзээрэй") shows ONLY when the
 * selected plan genuinely has a trial; otherwise the normal premium purchase copy is kept.
 */
export function premiumCtaLabelKey(opts: { isPremium: boolean; hasTrial: boolean }): PremiumCtaLabelKey {
  if (opts.isPremium) return 'premium.activeCta';
  return opts.hasTrial ? 'premium.trialCta' : 'premium.cta';
}

/** The auto-renew trial footer is shown only on the pre-purchase paywall for a trial-eligible plan. */
export function shouldShowTrialFooter(opts: { isPremium: boolean; hasTrial: boolean }): boolean {
  return !opts.isPremium && opts.hasTrial;
}

export function pickManageSubscriptionProductId(plans: PremiumPlanDisplay[]): string | null {
  return plans.find((plan) => plan.id === 'yearly' && plan.productIdentifier)?.productIdentifier
    ?? plans.find((plan) => plan.productIdentifier)?.productIdentifier
    ?? null;
}
