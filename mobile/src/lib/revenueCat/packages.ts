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
};

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
  };
}

function planFromPackage(id: RevenueCatPlanId, pkg: PurchasesPackage): PremiumPlanDisplay {
  const product = pkg.product;
  const price = product.priceString?.trim();
  const yearlyMonthPrice = id === 'yearly' ? product.pricePerMonthString?.trim() : undefined;
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
  }));
}

export function pickManageSubscriptionProductId(plans: PremiumPlanDisplay[]): string | null {
  return plans.find((plan) => plan.id === 'yearly' && plan.productIdentifier)?.productIdentifier
    ?? plans.find((plan) => plan.productIdentifier)?.productIdentifier
    ?? null;
}
