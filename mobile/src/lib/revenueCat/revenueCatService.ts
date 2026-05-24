import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import {
  isRevenueCatConfigured,
  packageIdentifierForPlan,
  readOfferingIdentifier,
  readRevenueCatApiKey,
  type RevenueCatPlanId,
} from './config';
import { findPackageByIdentifier } from './entitlements';
import { PURCHASES_NOT_CONFIGURED_MESSAGE } from './messages';
import { buildPremiumPlanDisplays, fallbackPremiumPlanDisplays, type PremiumPlanDisplay } from './packages';

let configured = false;

export class RevenueCatNotConfiguredError extends Error {
  constructor(message = PURCHASES_NOT_CONFIGURED_MESSAGE) {
    super(message);
    this.name = 'RevenueCatNotConfiguredError';
  }
}

function assertRevenueCatConfigured(): void {
  if (!isRevenueCatConfigured()) {
    throw new RevenueCatNotConfiguredError();
  }
}

async function getPurchasesModule() {
  assertRevenueCatConfigured();
  const mod = await import('react-native-purchases');
  return mod.default;
}

export async function configureRevenueCat(appUserId?: string | null): Promise<void> {
  const apiKey = readRevenueCatApiKey();
  if (!apiKey) return;

  const Purchases = await getPurchasesModule();

  if (!configured) {
    Purchases.configure({ apiKey });
    configured = true;
  }

  if (appUserId) {
    await Purchases.logIn(appUserId);
  }
}

export async function logOutRevenueCat(): Promise<void> {
  if (!configured || !isRevenueCatConfigured()) return;
  try {
    const Purchases = await getPurchasesModule();
    await Purchases.logOut();
  } catch {
    // Anonymous user after logout is expected.
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  const Purchases = await getPurchasesModule();
  return Purchases.getCustomerInfo();
}

export async function getCurrentOfferings(): Promise<PurchasesOfferings> {
  const Purchases = await getPurchasesModule();
  return Purchases.getOfferings();
}

export async function resolvePackageForPlan(plan: RevenueCatPlanId): Promise<PurchasesPackage> {
  const offerings = await getCurrentOfferings();
  const offeringId = readOfferingIdentifier();
  const offering = offeringId
    ? offerings.all[offeringId] ?? offerings.current
    : offerings.current;

  if (!offering) {
    throw new Error('No RevenueCat offering is configured. Check your dashboard offering.');
  }

  const identifier = packageIdentifierForPlan(plan);
  const pkg = findPackageByIdentifier(offering.availablePackages, identifier);
  if (!pkg) {
    throw new Error(
      `Subscription package "${identifier}" was not found. Available: ${offering.availablePackages
        .map((p) => p.identifier)
        .join(', ')}`,
    );
  }
  return pkg;
}

export async function getPremiumPlanDisplays(): Promise<PremiumPlanDisplay[]> {
  if (!isRevenueCatConfigured()) {
    return fallbackPremiumPlanDisplays('RevenueCat is not configured for this build.');
  }

  const offerings = await getCurrentOfferings();
  const offeringId = readOfferingIdentifier();
  const offering = offeringId
    ? offerings.all[offeringId] ?? offerings.current
    : offerings.current;

  if (!offering) {
    return fallbackPremiumPlanDisplays('No RevenueCat offering is configured for this build.');
  }

  return buildPremiumPlanDisplays(offering.availablePackages ?? []);
}

export async function purchasePlan(plan: RevenueCatPlanId): Promise<CustomerInfo> {
  assertRevenueCatConfigured();
  const Purchases = await getPurchasesModule();
  const pkg = await resolvePackageForPlan(plan);
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  assertRevenueCatConfigured();
  const Purchases = await getPurchasesModule();
  return Purchases.restorePurchases();
}

export function isRevenueCatReady(): boolean {
  return isRevenueCatConfigured() && configured;
}
