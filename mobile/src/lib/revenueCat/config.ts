import { Platform } from 'react-native';
import { REVENUECAT_ENTITLEMENT_PREMIUM } from './entitlements';

export { REVENUECAT_ENTITLEMENT_PREMIUM };

export type RevenueCatPlanId = 'monthly' | 'yearly';

function readEnv(key: string): string {
  const g = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
  };
  const raw = g.process?.env?.[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

export function readRevenueCatApiKey(): string {
  if (Platform.OS === 'ios') {
    return readEnv('EXPO_PUBLIC_REVENUECAT_API_KEY_IOS');
  }
  if (Platform.OS === 'android') {
    return readEnv('EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID');
  }
  return '';
}

export function isRevenueCatConfigured(): boolean {
  return readRevenueCatApiKey().length > 0;
}

export function readOfferingIdentifier(): string | undefined {
  const raw = readEnv('EXPO_PUBLIC_REVENUECAT_OFFERING_ID');
  return raw.length > 0 ? raw : undefined;
}

/** Package identifiers in the RevenueCat offering (dashboard / StoreKit products). */
export function packageIdentifierForPlan(plan: RevenueCatPlanId): string {
  if (plan === 'yearly') {
    const annual = readEnv('EXPO_PUBLIC_REVENUECAT_PACKAGE_ANNUAL');
    return annual.length > 0 ? annual : 'annual';
  }
  const monthly = readEnv('EXPO_PUBLIC_REVENUECAT_PACKAGE_MONTHLY');
  return monthly.length > 0 ? monthly : 'monthly';
}

export type RevenueCatConfigurationStatus = {
  platform: typeof Platform.OS;
  configured: boolean;
  offeringIdentifier: string | null;
  monthlyPackageIdentifier: string;
  annualPackageIdentifier: string;
};

export function readRevenueCatConfigurationStatus(): RevenueCatConfigurationStatus {
  return {
    platform: Platform.OS,
    configured: isRevenueCatConfigured(),
    offeringIdentifier: readOfferingIdentifier() ?? null,
    monthlyPackageIdentifier: packageIdentifierForPlan('monthly'),
    annualPackageIdentifier: packageIdentifierForPlan('yearly'),
  };
}
