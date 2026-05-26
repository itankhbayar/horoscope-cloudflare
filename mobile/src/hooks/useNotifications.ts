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
import {
  pauseAtmosphericReminders,
  readLocalAtmosphericNotificationPrefs,
  resetAtmosphericNotificationPersonalization,
  saveLocalAtmosphericNotificationPrefs,
  scheduleAtmosphericReminder,
  type AtmosphericScheduleResult,
} from '../lib/notifications/atmosphericDelivery';
import {
  deliveryFeedbackForScheduleResult,
  loadAtmosphericDeliveryState,
  reconcileAtmosphericReminderState,
  type AtmosphericDeliveryState,
} from '../lib/notifications/deliveryState';
import { getEmotionalPatternMemory, summarizeEmotionalPatternMemory } from '../lib/emotionalPatternMemory';
import { getCalmRitualPreset, type CalmRitualPresetId } from '../lib/calmRitualPresets';
import * as horoscopeService from '@astralis/lib/horoscopeService';
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
  setReminderHourLocal: (hour: number) => Promise<void>;
  setQuietHoursWindow: (start: string, end: string) => Promise<void>;
  applyRitualPreset: (presetId: CalmRitualPresetId) => Promise<void>;
  silentModeEnabled: boolean;
  deliveryState: AtmosphericDeliveryState | null;
  scheduleFeedback: { title: string; message: string } | null;
  setSilentModeEnabled: (enabled: boolean) => Promise<void>;
  scheduleNightlyAtmosphericReminder: () => Promise<AtmosphericScheduleResult>;
  pauseReminders: (days: number) => Promise<void>;
  resumeReminders: () => Promise<void>;
  resetNotificationPersonalization: () => Promise<void>;
} {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [silentModeEnabled, setSilentModeEnabledState] = useState(false);
  const [deliveryState, setDeliveryState] = useState<AtmosphericDeliveryState | null>(null);
  const [scheduleFeedback, setScheduleFeedback] = useState<{ title: string; message: string } | null>(null);
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
      const localPrefs = await readLocalAtmosphericNotificationPrefs();
      setSilentModeEnabledState(localPrefs.silentModeEnabled);
      const perms = await Notifications.getPermissionsAsync();
      setPermissionDenied(perms.status === 'denied');
      const reconciled = await reconcileAtmosphericReminderState();
      if (reconciled.duplicateCleanupCount > 0) {
        void track('duplicate_reminder_cleanup', { count: reconciled.duplicateCleanupCount });
      }
      if (reconciled.staleRecovered) {
        void track('stale_reminder_recovery', { recovered: true });
      }
      const state = await loadAtmosphericDeliveryState({ preferences: prefs, readiness });
      setDeliveryState(state);
      void track('delivery_state_viewed', {
        scheduled: state.scheduled,
        permissionStatus: state.permissionStatus,
        paused: state.paused,
      });
      if (!state.readiness.canRequestPush) void track('disabled_state_impression', { reason: 'unavailable' });
      if (state.permissionStatus === 'denied') void track('disabled_state_impression', { reason: 'permission_denied' });
      if (!state.enabled) void track('disabled_state_impression', { reason: 'disabled' });
      if (state.paused) void track('disabled_state_impression', { reason: 'paused' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, [readiness]);

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
            void track('notification_permission_prompt_shown', { source: 'settings' });
            expoPushToken = await ensurePermissionAndToken();
            setPermissionDenied(false);
            void track('notification_permission_accepted', { source: 'settings' });
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to enable notifications';
            if (msg.toLowerCase().includes('not granted')) {
              setPermissionDenied(true);
              void track('notification_permission_denied', { source: 'settings' });
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

  const setReminderHourLocal = useCallback(
    async (hour: number): Promise<void> => {
      setSaving(true);
      setError(null);
      try {
        const next = await applyUpdate({ reminderHourLocal: hour });
        setDeliveryState(await loadAtmosphericDeliveryState({ preferences: next, readiness }));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update reminder time');
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [applyUpdate, readiness],
  );

  const setQuietHoursWindow = useCallback(
    async (start: string, end: string): Promise<void> => {
      setSaving(true);
      setError(null);
      try {
        const next = await applyUpdate({ quietHoursStart: start, quietHoursEnd: end, quietHoursEnabled: true });
        setDeliveryState(await loadAtmosphericDeliveryState({ preferences: next, readiness }));
        void track('quiet_hour_preference_saved', { start, end, enabled: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update quiet-hour window');
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [applyUpdate, readiness],
  );

  const applyRitualPreset = useCallback(
    async (presetId: CalmRitualPresetId): Promise<void> => {
      setSaving(true);
      setError(null);
      try {
        const preset = getCalmRitualPreset(presetId);
        const next = await applyUpdate(preset.notificationPatch);
        await saveLocalAtmosphericNotificationPrefs({ silentModeEnabled: preset.silentModeEnabled });
        setSilentModeEnabledState(preset.silentModeEnabled);
        setDeliveryState(await loadAtmosphericDeliveryState({ preferences: next, readiness }));
        void track('ritual_preset_adopted', { preset: preset.id });
        void track('calm_mode_retention', { preset: preset.id, source: 'settings' });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to apply ritual preset');
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [applyUpdate, readiness],
  );

  const setSilentModeEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      await saveLocalAtmosphericNotificationPrefs({ silentModeEnabled: enabled });
      setSilentModeEnabledState(enabled);
      void track('silent_mode_enabled', { enabled });
      if (preferences) {
        const state = await loadAtmosphericDeliveryState({ preferences, readiness });
        setDeliveryState({ ...state, silentModeEnabled: enabled });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update silent invitations');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [preferences, readiness]);

  const scheduleNightlyAtmosphericReminder = useCallback(async (): Promise<AtmosphericScheduleResult> => {
    if (!preferences?.allEnabled || !preferences.dailyReminderEnabled) {
      const result = await scheduleAtmosphericReminder({
        enabled: false,
        prefs: {
          reminderHourLocal: preferences?.reminderHourLocal ?? 20,
          quietHoursEnabled: preferences?.quietHoursEnabled ?? true,
          quietHoursStart: preferences?.quietHoursStart ?? '22:00',
          quietHoursEnd: preferences?.quietHoursEnd ?? '08:00',
          silentModeEnabled,
        },
        sky: null,
        memory: null,
      });
      setScheduleFeedback(deliveryFeedbackForScheduleResult(result));
      if (!result.scheduled) {
        void track('reminder_schedule_failed', { type: 'atmospheric_ritual', reason: result.reason });
      }
      setDeliveryState(await loadAtmosphericDeliveryState({ preferences, readiness }));
      return result;
    }
    const [sky, memory] = await Promise.all([
      horoscopeService.fetchGlobalSkyToday().catch(() => null),
      getEmotionalPatternMemory().then(summarizeEmotionalPatternMemory).catch(() => null),
    ]);
    const result = await scheduleAtmosphericReminder({
      enabled: true,
      prefs: {
        reminderHourLocal: preferences.reminderHourLocal,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        silentModeEnabled,
      },
      sky,
      memory,
    });
    if (result.scheduled) {
      void track('reminder_scheduled', {
        type: 'atmospheric_ritual',
        fireDateISO: result.fireDateISO,
        silent: silentModeEnabled,
      });
      if (result.quietHourAdjusted) {
        void track('quiet_hour_adjustment_applied', {
          desiredHHMM: result.desiredHHMM,
          scheduledHHMM: result.scheduledHHMM,
        });
      }
    } else {
      void track('reminder_schedule_failed', { type: 'atmospheric_ritual', reason: result.reason });
    }
    setScheduleFeedback(deliveryFeedbackForScheduleResult(result));
    setDeliveryState(await loadAtmosphericDeliveryState({ preferences, readiness }));
    return result;
  }, [preferences, readiness, silentModeEnabled]);

  const pauseReminders = useCallback(async (days: number): Promise<void> => {
    const pausedUntilISO = await pauseAtmosphericReminders(days);
    void track('pause_reminders_used', { days, pausedUntilISO });
    if (preferences) {
      setDeliveryState(await loadAtmosphericDeliveryState({ preferences, readiness }));
    }
  }, [preferences, readiness]);

  const resumeReminders = useCallback(async (): Promise<void> => {
    await saveLocalAtmosphericNotificationPrefs({ pausedUntilISO: null });
    void track('reminder_resume', { source: 'settings' });
    if (preferences) {
      setDeliveryState(await loadAtmosphericDeliveryState({ preferences, readiness }));
    }
  }, [preferences, readiness]);

  const resetNotificationPersonalization = useCallback(async (): Promise<void> => {
    await resetAtmosphericNotificationPersonalization();
    setSilentModeEnabledState(false);
    void track('notification_personalization_reset', { source: 'settings' });
    if (preferences) {
      setDeliveryState(await loadAtmosphericDeliveryState({ preferences, readiness }));
    }
  }, [preferences, readiness]);

  return {
    preferences,
    loading,
    saving,
    error,
    readiness,
    load,
    setAllEnabled,
    setChildEnabled,
    setReminderHourLocal,
    setQuietHoursWindow,
    applyRitualPreset,
    silentModeEnabled,
    deliveryState,
    scheduleFeedback,
    setSilentModeEnabled,
    scheduleNightlyAtmosphericReminder,
    pauseReminders,
    resumeReminders,
    resetNotificationPersonalization,
  };
}
