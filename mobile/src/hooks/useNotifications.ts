import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as notificationService from '@astralis/lib/notificationService';
import type {
  NotificationPreferences,
  NotificationPreferencesUpdate,
  PushTokenRegistrationPayload,
} from '@astralis/lib/types';
import { getNotificationReadiness, type NotificationReadiness } from '../lib/notifications/readiness';
import { track } from '../lib/analytics';

const EXPO_PUSH_TOKEN_CACHE_KEY = 'notifications:expo-push-token';
const ANDROID_CHANNEL_ID = 'default';

type NotificationKey =
  | 'saleAlertsEnabled'
  | 'horoscopesEnabled'
  | 'transitsEnabled'
  | 'dailyReminderEnabled'
  | 'streakReminderEnabled'
  | 'reEngagementEnabled'
  | 'quietHoursEnabled';

function resolveExpoProjectId(): string | null {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const fromEas = Constants.easConfig?.projectId;
  const fromRootExtra = (Constants.expoConfig?.extra as { projectId?: string } | undefined)?.projectId;
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  const fromEnv = g.process?.env?.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  const projectId = fromExtra ?? fromEas ?? fromRootExtra ?? (fromEnv && fromEnv.length > 0 ? fromEnv : undefined);
  return projectId ?? null;
}

function resolvePushPlatform(): PushTokenRegistrationPayload['platform'] {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'web') return 'web';
  return 'unknown';
}

async function ensurePermissionAndToken(): Promise<string> {
  const readiness = getNotificationReadiness({
    isDevice: Device.isDevice,
    projectId: resolveExpoProjectId(),
  });
  if (!readiness.canRequestPush) throw new Error(readiness.reason ?? 'Push notifications are not available.');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }
  const projectId = resolveExpoProjectId();
  if (!projectId) throw new Error('Expo projectId is missing.');
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export function useNotifications(): {
  preferences: NotificationPreferences | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  readiness: NotificationReadiness;
  load: () => Promise<void>;
  setAllEnabled: (enabled: boolean) => Promise<void>;
  setChildEnabled: (key: NotificationKey, enabled: boolean) => Promise<void>;
} {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const readiness = useMemo(
    () =>
      getNotificationReadiness({
        isDevice: Device.isDevice,
        projectId: resolveExpoProjectId(),
      }),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prefs = await notificationService.fetchNotificationPreferences();
      setPreferences(prefs);
      const perms = await Notifications.getPermissionsAsync();
      setPermissionDenied(perms.status === 'denied');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  const applyUpdate = useCallback(async (patch: NotificationPreferencesUpdate) => {
    const next = await notificationService.updateNotificationPreferences(patch);
    setPreferences(next);
    return next;
  }, []);

  const setAllEnabled = useCallback(
    async (enabled: boolean) => {
      setSaving(true);
      setError(null);
      try {
        if (enabled) {
          void track('notification_opt_in_started', { source: 'settings' });
          if (!readiness.canRequestPush) {
            void track('notification_opt_in_failed', { reason: 'unavailable' });
            throw new Error(readiness.reason ?? 'Push notifications are not available on this device.');
          }
          let expoPushToken = '';
          try {
            expoPushToken = await ensurePermissionAndToken();
            setPermissionDenied(false);
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to enable notifications';
            if (msg.toLowerCase().includes('not granted')) {
              setPermissionDenied(true);
              Alert.alert(
                'Last step!',
                Platform.OS === 'ios'
                  ? 'Notifications must be enabled in your iOS settings.'
                  : 'Notifications must be enabled in your device settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Settings', onPress: () => void Linking.openSettings() },
                ],
              );
            }
            throw e;
          }
          const payload: PushTokenRegistrationPayload = {
            expoPushToken,
            platform: resolvePushPlatform(),
            deviceId: Device.osInternalBuildId ?? Device.modelId ?? null,
          };
          await notificationService.registerPushToken(payload);
          await AsyncStorage.setItem(EXPO_PUSH_TOKEN_CACHE_KEY, expoPushToken);
          await applyUpdate({
            allEnabled: true,
            saleAlertsEnabled: true,
            horoscopesEnabled: true,
            transitsEnabled: true,
            dailyReminderEnabled: true,
            streakReminderEnabled: true,
            reEngagementEnabled: true,
            quietHoursEnabled: true,
          });
          void track('notification_opt_in_completed', { source: 'settings' });
          return;
        }

        await applyUpdate({ allEnabled: false });
        const cachedToken = await AsyncStorage.getItem(EXPO_PUSH_TOKEN_CACHE_KEY);
        if (cachedToken) {
          await notificationService.disablePushToken(cachedToken);
        }
        void track('notification_opt_out', { source: 'settings' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to update notifications';
        void track('notification_opt_in_failed', {
          reason: msg.toLowerCase().includes('not granted')
            ? 'permission_denied'
            : msg.toLowerCase().includes('network')
              ? 'network'
              : 'unknown',
        });
        if (msg !== 'Notification permission was not granted.') {
          setError(msg);
        }
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [applyUpdate, readiness.canRequestPush, readiness.reason],
  );

  const setChildEnabled = useCallback(
    async (key: NotificationKey, enabled: boolean) => {
      setSaving(true);
      setError(null);
      try {
        await applyUpdate({ [key]: enabled });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update notifications');
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [applyUpdate],
  );

  return {
    preferences,
    loading,
    saving,
    error,
    readiness,
    load,
    setAllEnabled,
    setChildEnabled,
  };
}
