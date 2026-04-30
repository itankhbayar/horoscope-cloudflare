import { apiRequest } from './apiClient';
import type { ProfilePayload } from './types';

export async function fetchProfile(): Promise<ProfilePayload> {
  return apiRequest<ProfilePayload>('/api/profile', { auth: true });
}

export async function recomputeNatalChart(): Promise<ProfilePayload> {
  return apiRequest<ProfilePayload>('/api/profile/recompute', { method: 'POST', auth: true });
}
