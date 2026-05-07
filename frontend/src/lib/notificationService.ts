import { apiRequest } from './apiClient';
import type {
  NotificationPreferences,
  NotificationPreferencesUpdate,
  PushTokenRegistrationPayload,
} from './types';

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>('/api/notifications/preferences', {
    auth: true,
  });
}

export async function updateNotificationPreferences(
  payload: NotificationPreferencesUpdate,
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>('/api/notifications/preferences', {
    method: 'PATCH',
    auth: true,
    body: payload,
  });
}

export async function registerPushToken(payload: PushTokenRegistrationPayload): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>('/api/notifications/push-token', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export async function disablePushToken(expoPushToken: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>('/api/notifications/push-token', {
    method: 'DELETE',
    auth: true,
    body: { expoPushToken },
  });
}
