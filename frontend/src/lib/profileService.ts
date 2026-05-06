import { apiRequest } from './apiClient';
import type { ProfilePayload } from './types';

export async function fetchProfile(): Promise<ProfilePayload> {
  return apiRequest<ProfilePayload>('/api/profile', { auth: true });
}

export async function recomputeNatalChart(): Promise<ProfilePayload> {
  return apiRequest<ProfilePayload>('/api/profile/recompute', { method: 'POST', auth: true });
}

export async function updateProfile(payload: {
  displayName: string;
  bio: string;
  timezone: string;
} | {
  fullName: string;
  zodiacSign: string;
  birthDate: string;
  timezoneOffset: number;
}): Promise<ProfilePayload> {
  const normalized =
    'displayName' in payload
      ? payload
      : {
          displayName: payload.fullName,
          bio: '',
          timezone: timezoneFromOffset(payload.timezoneOffset),
        };
  return apiRequest<ProfilePayload>('/api/profile', {
    method: 'PATCH',
    auth: true,
    body: normalized,
  });
}

export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append('avatar', file);
  return apiRequest<{ avatarUrl: string }>('/api/profile/avatar', {
    method: 'POST',
    auth: true,
    body: form,
  });
}

function timezoneFromOffset(offset: number): string {
  if (!Number.isFinite(offset)) return 'UTC';
  return 'UTC';
}
