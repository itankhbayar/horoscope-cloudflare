import { apiRequest } from './apiClient';
import type { CompatibilityResult, ZodiacSign } from './types';

export async function compareSigns(
  sign1: ZodiacSign,
  sign2: ZodiacSign,
  persist = false,
): Promise<CompatibilityResult> {
  return apiRequest<CompatibilityResult>('/api/compatibility/signs', {
    method: 'POST',
    body: { sign1, sign2, persist },
  });
}

export async function compareWithUser(
  otherUserId: string,
  persist = false,
): Promise<CompatibilityResult> {
  return apiRequest<CompatibilityResult>('/api/compatibility/users', {
    method: 'POST',
    auth: true,
    body: { otherUserId, persist },
  });
}
