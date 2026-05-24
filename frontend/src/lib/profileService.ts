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
  birthDate: string;
  birthTime?: string | null;
  birthCity: string;
  birthCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezoneOffset: number;
}): Promise<ProfilePayload> {
  const normalized =
    'displayName' in payload
      ? payload
      : {
          fullName: payload.fullName,
          birthDate: payload.birthDate,
          birthTime: payload.birthTime ?? null,
          birthCity: payload.birthCity,
          birthCountry: payload.birthCountry ?? null,
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
          timezoneOffset: payload.timezoneOffset,
        };
  return apiRequest<ProfilePayload>('/api/profile', {
    method: 'PATCH',
    auth: true,
    body: normalized,
  });
}

export async function uploadAvatar(fileOrFormData: File | FormData): Promise<{ avatarUrl: string }> {
  if (fileOrFormData instanceof FormData) {
    return apiRequest<{ avatarUrl: string }>('/api/profile/avatar', {
      method: 'POST',
      auth: true,
      body: fileOrFormData,
    });
  }
  const form = new FormData();
  form.append('avatar', fileOrFormData);
  return apiRequest<{ avatarUrl: string }>('/api/profile/avatar', {
    method: 'POST',
    auth: true,
    body: form,
  });
}
