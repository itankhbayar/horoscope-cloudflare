import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { GlobalSkyToday } from '@astralis/lib/types';
import type { EmotionalPatternSummary } from '../emotionalPatternMemory';

export type AtmosphericNotificationCopy = {
  title: string;
  body: string;
  reason: 'tension' | 'intimacy' | 'clarity' | 'reflection' | 'socialOpenness' | 'familiar';
};

export type AtmosphericDeliveryPreferences = {
  reminderHourLocal: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  silentModeEnabled: boolean;
  pausedUntilISO?: string | null;
};

export type AtmosphericScheduleResult =
  | {
      scheduled: true;
      notificationId: string;
      fireDateISO: string;
      copy: AtmosphericNotificationCopy;
      quietHourAdjusted: boolean;
      desiredHHMM: string;
      scheduledHHMM: string;
    }
  | { scheduled: false; reason: 'disabled' | 'paused' | 'permission_denied' | 'unavailable' };

export const SCHEDULE_ID_KEY = 'notifications:atmospheric-nightly-id';
const LOCAL_PREFS_KEY = 'notifications:atmospheric-local-prefs:v1';
const DELIVERY_META_KEY = 'notifications:atmospheric-delivery-meta:v1';
const MAX_DAYS_PAUSED = 30;

export type AtmosphericDeliveryMeta = {
  lastScheduledISO?: string | null;
  lastScheduledId?: string | null;
  lastDeliveredISO?: string | null;
  lastDeliveredReason?: string | null;
  lastOpenedISO?: string | null;
  lastOpenedReason?: string | null;
  lastSchedulingError?: string | null;
  personalizationResetAtISO?: string | null;
  duplicateCleanupCount?: number;
  staleRecoveryCount?: number;
};

function minutes(value: string): number {
  const [hh, mm] = value.split(':').map((part) => Number(part));
  const hour = Number.isFinite(hh) ? (hh as number) : 0;
  const minute = Number.isFinite(mm) ? (mm as number) : 0;
  return hour * 60 + minute;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function isInsideQuietHours(localHHMM: string, prefs: Pick<AtmosphericDeliveryPreferences, 'quietHoursEnabled' | 'quietHoursStart' | 'quietHoursEnd'>): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const now = minutes(localHHMM);
  const start = minutes(prefs.quietHoursStart);
  const end = minutes(prefs.quietHoursEnd);
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

export function resolveReminderHHMM(prefs: AtmosphericDeliveryPreferences): string {
  const desired = `${pad(Math.max(0, Math.min(23, prefs.reminderHourLocal)))}:00`;
  if (!isInsideQuietHours(desired, prefs)) return desired;
  const beforeQuietStart = Math.max(0, minutes(prefs.quietHoursStart) - 30);
  return `${pad(Math.floor(beforeQuietStart / 60))}:${pad(beforeQuietStart % 60)}`;
}

export function quietHourAdjustmentApplied(prefs: AtmosphericDeliveryPreferences): boolean {
  const desired = `${pad(Math.max(0, Math.min(23, prefs.reminderHourLocal)))}:00`;
  return resolveReminderHHMM(prefs) !== desired;
}

export function nextAtmosphericReminderDate(now: Date, prefs: AtmosphericDeliveryPreferences): Date | null {
  if (prefs.pausedUntilISO && new Date(prefs.pausedUntilISO).getTime() > now.getTime()) return null;
  const [hour, minute] = resolveReminderHHMM(prefs).split(':').map(Number);
  const next = new Date(now);
  next.setHours(hour ?? 20, minute ?? 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

export function buildAtmosphericNotificationCopy(
  sky: GlobalSkyToday | null,
  memory: EmotionalPatternSummary | null,
): AtmosphericNotificationCopy {
  if (memory?.ritualNights && memory.ritualNights >= 3 && memory.strongestSignal) {
    return {
      title: 'Tonight may feel familiar',
      body: `The emotional tone resembles the ${memory.strongestSignal.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`)} you have lingered with recently.`,
      reason: 'familiar',
    };
  }
  if (!sky) {
    return {
      title: 'A quiet sky ritual is available',
      body: 'One small check-in may be enough tonight.',
      reason: 'reflection',
    };
  }
  if (sky.atmosphere.tension >= 64) {
    return {
      title: 'Tonight feels emotionally direct',
      body: 'The atmosphere favors honesty over overthinking.',
      reason: 'tension',
    };
  }
  if (sky.atmosphere.intimacy >= 64) {
    return {
      title: 'Tonight feels closer than usual',
      body: 'Small shifts in tone may carry more meaning.',
      reason: 'intimacy',
    };
  }
  if (sky.atmosphere.clarity >= 64) {
    return {
      title: 'The sky feels unusually readable',
      body: 'A calm ritual may help the day settle into language.',
      reason: 'clarity',
    };
  }
  if (sky.atmosphere.socialOpenness >= 60) {
    return {
      title: 'Tonight opens softly',
      body: 'Connection may feel easier when nothing is forced.',
      reason: 'socialOpenness',
    };
  }
  return {
    title: "Tonight's atmosphere is quieter",
    body: 'A small ritual may be enough.',
    reason: 'reflection',
  };
}

export function notificationCopyIsSafe(copy: AtmosphericNotificationCopy): boolean {
  const text = `${copy.title} ${copy.body}`;
  return !/(streak|hurry|urgent|don't miss|need to|we know you feel|sad|depressed|diagnos|something important is waiting)/i.test(text);
}

export async function readLocalAtmosphericNotificationPrefs(): Promise<Pick<AtmosphericDeliveryPreferences, 'silentModeEnabled' | 'pausedUntilISO'>> {
  const raw = await AsyncStorage.getItem(LOCAL_PREFS_KEY);
  if (!raw) return { silentModeEnabled: false, pausedUntilISO: null };
  try {
    const parsed = JSON.parse(raw) as Partial<AtmosphericDeliveryPreferences>;
    return {
      silentModeEnabled: Boolean(parsed.silentModeEnabled),
      pausedUntilISO: typeof parsed.pausedUntilISO === 'string' ? parsed.pausedUntilISO : null,
    };
  } catch {
    return { silentModeEnabled: false, pausedUntilISO: null };
  }
}

export async function saveLocalAtmosphericNotificationPrefs(
  patch: Partial<Pick<AtmosphericDeliveryPreferences, 'silentModeEnabled' | 'pausedUntilISO'>>,
): Promise<Pick<AtmosphericDeliveryPreferences, 'silentModeEnabled' | 'pausedUntilISO'>> {
  const current = await readLocalAtmosphericNotificationPrefs();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(next));
  return next;
}

export async function readAtmosphericDeliveryMeta(): Promise<AtmosphericDeliveryMeta> {
  const raw = await AsyncStorage.getItem(DELIVERY_META_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as AtmosphericDeliveryMeta;
  } catch {
    return {};
  }
}

export async function saveAtmosphericDeliveryMeta(patch: AtmosphericDeliveryMeta): Promise<AtmosphericDeliveryMeta> {
  const current = await readAtmosphericDeliveryMeta();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(DELIVERY_META_KEY, JSON.stringify(next));
  return next;
}

export async function recordAtmosphericReminderDelivered(reason?: string): Promise<void> {
  await saveAtmosphericDeliveryMeta({
    lastDeliveredISO: new Date().toISOString(),
    lastDeliveredReason: reason ?? null,
  });
}

export async function recordAtmosphericReminderOpened(reason?: string): Promise<void> {
  await saveAtmosphericDeliveryMeta({
    lastOpenedISO: new Date().toISOString(),
    lastOpenedReason: reason ?? null,
  });
}

export async function pauseAtmosphericReminders(days: number): Promise<string> {
  const safeDays = Math.max(1, Math.min(MAX_DAYS_PAUSED, Math.round(days)));
  const until = new Date();
  until.setDate(until.getDate() + safeDays);
  await saveLocalAtmosphericNotificationPrefs({ pausedUntilISO: until.toISOString() });
  await cancelAtmosphericReminder();
  return until.toISOString();
}

export async function resetAtmosphericNotificationPersonalization(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_PREFS_KEY);
  await saveAtmosphericDeliveryMeta({ personalizationResetAtISO: new Date().toISOString() });
}

export async function cancelAtmosphericReminder(): Promise<void> {
  const existing = await AsyncStorage.getItem(SCHEDULE_ID_KEY);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing);
    await AsyncStorage.removeItem(SCHEDULE_ID_KEY);
  }
}

export async function scheduleAtmosphericReminder({
  enabled,
  prefs,
  sky,
  memory,
}: {
  enabled: boolean;
  prefs: AtmosphericDeliveryPreferences;
  sky: GlobalSkyToday | null;
  memory: EmotionalPatternSummary | null;
}): Promise<AtmosphericScheduleResult> {
  if (!enabled) {
    await cancelAtmosphericReminder();
    await saveAtmosphericDeliveryMeta({ lastSchedulingError: null, lastScheduledISO: null, lastScheduledId: null });
    return { scheduled: false, reason: 'disabled' };
  }
  const fireDate = nextAtmosphericReminderDate(new Date(), prefs);
  if (!fireDate) {
    await cancelAtmosphericReminder();
    await saveAtmosphericDeliveryMeta({ lastSchedulingError: 'paused', lastScheduledISO: null, lastScheduledId: null });
    return { scheduled: false, reason: 'paused' };
  }
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== 'granted') {
    await saveAtmosphericDeliveryMeta({ lastSchedulingError: 'permission_denied' });
    return { scheduled: false, reason: 'permission_denied' };
  }
  const copy = buildAtmosphericNotificationCopy(sky, memory);
  await cancelAtmosphericReminder();
  const desiredHHMM = `${pad(Math.max(0, Math.min(23, prefs.reminderHourLocal)))}:00`;
  const scheduledHHMM = resolveReminderHHMM(prefs);
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: prefs.silentModeEnabled ? 'A quiet sky ritual is available' : copy.title,
      body: prefs.silentModeEnabled ? 'Open Astralis when the night feels ready.' : copy.body,
      sound: prefs.silentModeEnabled ? false : undefined,
      data: {
        kind: 'atmospheric_ritual',
        reason: copy.reason,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
    },
  });
  await AsyncStorage.setItem(SCHEDULE_ID_KEY, notificationId);
  await saveAtmosphericDeliveryMeta({
    lastScheduledISO: fireDate.toISOString(),
    lastScheduledId: notificationId,
    lastSchedulingError: null,
  });
  return {
    scheduled: true,
    notificationId,
    fireDateISO: fireDate.toISOString(),
    copy,
    quietHourAdjusted: desiredHHMM !== scheduledHHMM,
    desiredHHMM,
    scheduledHHMM,
  };
}
