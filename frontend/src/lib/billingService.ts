import { apiRequest } from './apiClient';

export async function createPremiumCheckoutSession(): Promise<{ url: string }> {
  return apiRequest<{ url: string }>('/api/billing/create-checkout-session', {
    method: 'POST',
    auth: true,
  });
}

export async function syncPremiumCheckoutSession(sessionId: string): Promise<{ isPremium: boolean }> {
  return apiRequest<{ isPremium: boolean }>('/api/billing/checkout/sync', {
    method: 'POST',
    auth: true,
    body: { sessionId },
  });
}
