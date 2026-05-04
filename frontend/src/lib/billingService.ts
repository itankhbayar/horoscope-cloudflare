import { apiRequest } from './apiClient';

export async function createPremiumCheckoutSession(): Promise<{ url: string }> {
  return apiRequest<{ url: string }>('/api/billing/create-checkout-session', {
    method: 'POST',
    auth: true,
  });
}
