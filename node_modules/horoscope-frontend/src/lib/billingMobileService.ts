import { apiRequest } from './apiClient';

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
  return apiRequest<{ isPremium: boolean; source: 'subscription' | 'customer' | 'none' }>(
    '/api/billing/mobile/restore',
    {
      method: 'POST',
      auth: true,
      localized: false,
    },
  );
}
