import { apiRequest } from './apiClient';
import { track } from './analytics';

export type MobilePremiumCheckoutResponse =
  | {
      mode: 'subscription';
      paymentIntentClientSecret: string;
      customerId: string;
      customerEphemeralKeySecret: string;
      subscriptionId: string;
    }
  | {
      mode: 'payment';
      paymentIntentClientSecret: string;
    };

export async function createMobilePremiumCheckout(
  body: { priceId?: string; idempotencyKey?: string } = {},
): Promise<MobilePremiumCheckoutResponse> {
  track('checkout_started', { channel: 'mobile' });
  return apiRequest<MobilePremiumCheckoutResponse>('/api/billing/mobile/checkout', {
    method: 'POST',
    body,
    auth: true,
    localized: false,
  });
}

export async function createMobileBillingPortalSession(returnUrl: string): Promise<{ url: string }> {
  return apiRequest<{ url: string }>('/api/billing/mobile/portal', {
    method: 'POST',
    body: { returnUrl },
    auth: true,
    localized: false,
  });
}

export async function restoreMobilePremiumStatus(): Promise<{
  isPremium: boolean;
  source: 'subscription' | 'customer' | 'none';
}> {
  const result = await apiRequest<{ isPremium: boolean; source: 'subscription' | 'customer' | 'none' }>(
    '/api/billing/mobile/restore',
    {
      method: 'POST',
      auth: true,
      localized: false,
    },
  );
  track('subscription_restored', { source: result.source, isPremium: result.isPremium });
  return result;
}
