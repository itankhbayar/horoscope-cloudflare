import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { NotificationPreferences } from '@astralis/lib/types';
import type { NotificationReadiness } from './readiness';
import {
  AtmosphericDeliveryPreferences,
  AtmosphericScheduleResult,
  SCHEDULE_ID_KEY,
  quietHourAdjustmentApplied,
  readAtmosphericDeliveryMeta,
  readLocalAtmosphericNotificationPrefs,
  resolveReminderHHMM,
  saveAtmosphericDeliveryMeta,
} from './atmosphericDelivery';

export type AtmosphericDeliveryState = {
  permissionStatus: 'granted' | 'denied' | 'undetermined' | 'unavailable';
  readiness: NotificationReadiness;
  enabled: boolean;
  dailyReminderEnabled: boolean;
  scheduled: boolean;
  nextScheduledISO: string | null;
  desiredHHMM: string | null;
  scheduledHHMM: string | null;
  quietHourAdjusted: boolean;
  quietHourMessage: string | null;
  silentModeEnabled: boolean;
  paused: boolean;
  pausedUntilISO: string | null;
  lastDeliveredISO: string | null;
  lastOpenedISO: string | null;
  lastSchedulingError: string | null;
  personalizationResetAtISO: string | null;
  statusText: string;
  detailText: string;
};

export type DeliveryStateInput = {
  preferences: NotificationPreferences | null;
  readiness: NotificationReadiness;
  permissionStatus: AtmosphericDeliveryState['permissionStatus'];
  scheduledISO?: string | null;
  now?: Date;
  localPrefs?: {
    silentModeEnabled: boolean;
    pausedUntilISO?: string | null;
  };
  lastDeliveredISO?: string | null;
  lastOpenedISO?: string | null;
  lastSchedulingError?: string | null;
  personalizationResetAtISO?: string | null;
};

type ScheduledAtmosphericReminder = {
  id: string;
  dateISO: string | null;
};

function prefsForDelivery(preferences: NotificationPreferences | null, silentModeEnabled: boolean, pausedUntilISO?: string | null): AtmosphericDeliveryPreferences {
  return {
    reminderHourLocal: preferences?.reminderHourLocal ?? 20,
    quietHoursEnabled: preferences?.quietHoursEnabled ?? true,
    quietHoursStart: preferences?.quietHoursStart ?? '22:00',
    quietHoursEnd: preferences?.quietHoursEnd ?? '08:00',
    silentModeEnabled,
    pausedUntilISO: pausedUntilISO ?? null,
  };
}

function scheduledDateISO(notification: Notifications.NotificationRequest): string | null {
  const trigger = notification.trigger as unknown as { date?: Date | string | number; value?: Date | string | number };
  const raw = trigger?.date ?? trigger?.value;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function deriveAtmosphericDeliveryState(input: DeliveryStateInput): AtmosphericDeliveryState {
  const now = input.now ?? new Date();
  const localPrefs = input.localPrefs ?? { silentModeEnabled: false, pausedUntilISO: null };
  const deliveryPrefs = prefsForDelivery(input.preferences, localPrefs.silentModeEnabled, localPrefs.pausedUntilISO);
  const desiredHHMM = `${String(Math.max(0, Math.min(23, deliveryPrefs.reminderHourLocal))).padStart(2, '0')}:00`;
  const scheduledHHMM = resolveReminderHHMM(deliveryPrefs);
  const quietHourAdjusted = quietHourAdjustmentApplied(deliveryPrefs);
  const pausedUntilISO = localPrefs.pausedUntilISO ?? null;
  const paused = Boolean(pausedUntilISO && new Date(pausedUntilISO).getTime() > now.getTime());
  const enabled = Boolean(input.preferences?.allEnabled);
  const dailyReminderEnabled = Boolean(input.preferences?.dailyReminderEnabled);
  const scheduled = Boolean(input.scheduledISO && !paused);

  let statusText = 'No reminder scheduled';
  let detailText = 'Turn on nightly ritual reminders when you want one calm invitation back to Astralis.';
  if (!input.readiness.canRequestPush) {
    statusText = 'Notifications are unavailable here';
    detailText = friendlyReadinessMessage(input.readiness);
  } else if (input.permissionStatus === 'denied') {
    statusText = 'Notifications are disabled in system settings';
    detailText = 'Astralis cannot send reminders until notifications are allowed in your device settings.';
  } else if (!enabled) {
    statusText = 'Notifications are off';
    detailText = 'No ritual reminders will be sent.';
  } else if (!dailyReminderEnabled) {
    statusText = 'Nightly ritual reminders are off';
    detailText = 'Atmosphere alerts can stay on without a daily reminder.';
  } else if (paused) {
    statusText = `Paused until ${formatDeliveryDate(pausedUntilISO)}`;
    detailText = 'Astralis will stay quiet until reminders resume.';
  } else if (scheduled && input.scheduledISO) {
    statusText = `Next ritual reminder: ${formatDeliveryDate(input.scheduledISO)}`;
    detailText = quietHourAdjusted
      ? 'This reminder was moved outside your quiet window.'
      : 'This reminder follows your preferred ritual window.';
  } else if (input.lastSchedulingError) {
    statusText = 'No reminder scheduled';
    detailText = scheduleFailureMessage(input.lastSchedulingError);
  }

  return {
    permissionStatus: input.permissionStatus,
    readiness: input.readiness,
    enabled,
    dailyReminderEnabled,
    scheduled,
    nextScheduledISO: scheduled ? input.scheduledISO ?? null : null,
    desiredHHMM,
    scheduledHHMM,
    quietHourAdjusted,
    quietHourMessage: quietHourAdjusted ? `Moved from ${desiredHHMM} to ${scheduledHHMM} to respect your quiet hours.` : null,
    silentModeEnabled: localPrefs.silentModeEnabled,
    paused,
    pausedUntilISO,
    lastDeliveredISO: input.lastDeliveredISO ?? null,
    lastOpenedISO: input.lastOpenedISO ?? null,
    lastSchedulingError: input.lastSchedulingError ?? null,
    personalizationResetAtISO: input.personalizationResetAtISO ?? null,
    statusText,
    detailText,
  };
}

export function deliveryFeedbackForScheduleResult(result: AtmosphericScheduleResult): { title: string; message: string } {
  if (result.scheduled) {
    return {
      title: 'Ritual reminder scheduled',
      message: result.quietHourAdjusted
        ? `Next reminder is set for ${formatDeliveryDate(result.fireDateISO)}. It moved from ${result.desiredHHMM} to ${result.scheduledHHMM} to stay outside quiet hours.`
        : `Next reminder is set for ${formatDeliveryDate(result.fireDateISO)}.`,
    };
  }
  return {
    title: 'No reminder scheduled',
    message: scheduleFailureMessage(result.reason),
  };
}

export function friendlyReadinessMessage(readiness: NotificationReadiness): string {
  if (readiness.canRequestPush) return 'This device can schedule ritual reminders.';
  if (readiness.reason?.toLowerCase().includes('physical device')) {
    return 'Push reminders are unavailable in this simulator. They can be enabled on a physical device.';
  }
  if (readiness.reason?.toLowerCase().includes('projectid')) {
    return 'Notification setup is incomplete for this build. Ritual reminders will stay off until the app is configured.';
  }
  return readiness.reason ?? 'Notifications are unavailable in this environment.';
}

export function scheduleFailureMessage(reason: string): string {
  if (reason === 'permission_denied') return 'Notifications are blocked in system settings.';
  if (reason === 'paused') return 'Reminders are paused. Astralis will stay quiet until the pause ends.';
  if (reason === 'disabled') return 'Nightly ritual reminders are disabled.';
  if (reason === 'unavailable') return 'This device cannot schedule reminders right now.';
  return 'Astralis could not schedule a reminder. Nothing was sent.';
}

export function formatDeliveryDate(value: string | null): string {
  if (!value) return 'not scheduled';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'not scheduled';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export async function reconcileAtmosphericReminderState(): Promise<{
  active: ScheduledAtmosphericReminder | null;
  duplicateCleanupCount: number;
  staleRecovered: boolean;
}> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const atmospheric = scheduled
    .filter((notification) => notification.content.data?.kind === 'atmospheric_ritual')
    .map((notification) => ({ id: notification.identifier, dateISO: scheduledDateISO(notification) }))
    .sort((a, b) => (a.dateISO ?? '').localeCompare(b.dateISO ?? ''));
  const keep = atmospheric[0] ?? null;
  const duplicates = atmospheric.slice(1);
  await Promise.all(duplicates.map((notification) => Notifications.cancelScheduledNotificationAsync(notification.id)));

  const storedId = await AsyncStorage.getItem(SCHEDULE_ID_KEY);
  const staleRecovered = Boolean(storedId && !atmospheric.some((notification) => notification.id === storedId));
  if (keep) {
    await AsyncStorage.setItem(SCHEDULE_ID_KEY, keep.id);
  } else if (storedId) {
    await AsyncStorage.removeItem(SCHEDULE_ID_KEY);
  }
  if (duplicates.length > 0 || staleRecovered) {
    const meta = await readAtmosphericDeliveryMeta();
    await saveAtmosphericDeliveryMeta({
      duplicateCleanupCount: (meta.duplicateCleanupCount ?? 0) + duplicates.length,
      staleRecoveryCount: (meta.staleRecoveryCount ?? 0) + (staleRecovered ? 1 : 0),
    });
  }
  return { active: keep, duplicateCleanupCount: duplicates.length, staleRecovered };
}

export async function loadAtmosphericDeliveryState({
  preferences,
  readiness,
}: {
  preferences: NotificationPreferences | null;
  readiness: NotificationReadiness;
}): Promise<AtmosphericDeliveryState> {
  const [permissions, localPrefs, meta, reconciled] = await Promise.all([
    Notifications.getPermissionsAsync().catch(() => ({ status: 'unavailable' as const })),
    readLocalAtmosphericNotificationPrefs(),
    readAtmosphericDeliveryMeta(),
    reconcileAtmosphericReminderState(),
  ]);
  return deriveAtmosphericDeliveryState({
    preferences,
    readiness,
    permissionStatus: permissions.status as AtmosphericDeliveryState['permissionStatus'],
    scheduledISO: reconciled.active?.dateISO ?? meta.lastScheduledISO ?? null,
    localPrefs,
    lastDeliveredISO: meta.lastDeliveredISO ?? null,
    lastOpenedISO: meta.lastOpenedISO ?? null,
    lastSchedulingError: meta.lastSchedulingError ?? null,
    personalizationResetAtISO: meta.personalizationResetAtISO ?? null,
  });
}
