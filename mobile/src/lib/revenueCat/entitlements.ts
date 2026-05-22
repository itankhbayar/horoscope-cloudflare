import type { CustomerInfo, PurchasesEntitlementInfo, PurchasesPackage } from 'react-native-purchases';

export const REVENUECAT_ENTITLEMENT_PREMIUM = 'premium';

export function entitlementIsActive(
  info: PurchasesEntitlementInfo | undefined,
  now = Date.now(),
): boolean {
  if (!info) return false;
  if (!info.isActive) return false;
  if (info.expirationDateMillis == null) return true;
  return info.expirationDateMillis > now;
}

export function hasPremiumEntitlement(
  customerInfo: CustomerInfo | null | undefined,
  entitlementId = REVENUECAT_ENTITLEMENT_PREMIUM,
): boolean {
  if (!customerInfo) return false;
  const info = customerInfo.entitlements.active[entitlementId];
  return entitlementIsActive(info);
}

export function findPackageByIdentifier(
  packages: PurchasesPackage[],
  identifier: string,
): PurchasesPackage | undefined {
  return packages.find((pkg) => pkg.identifier === identifier);
}
