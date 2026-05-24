import Constants from 'expo-constants';

export const APPLE_SUBSCRIPTIONS_DEEP_LINK = 'itms-apps://apps.apple.com/account/subscriptions';
export const APPLE_SUBSCRIPTIONS_WEB_URL = 'https://apps.apple.com/account/subscriptions';

type AndroidConfig = {
  packageName?: string | null;
  productId?: string | null;
};

export function getAndroidPackageName(): string | null {
  const pkg = Constants.expoConfig?.android?.package;
  return pkg && pkg.trim().length > 0 ? pkg.trim() : null;
}

export function buildPlaySubscriptionManagementUrl({ packageName, productId }: AndroidConfig): string | null {
  const pkg = packageName?.trim();
  const sku = productId?.trim();
  if (!pkg || !sku) return null;
  const params = new URLSearchParams({ sku, package: pkg });
  return `https://play.google.com/store/account/subscriptions?${params.toString()}`;
}
