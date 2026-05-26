import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { NotificationPreferences } from '@astralis/lib/types';
import {
  deliveryFeedbackForScheduleResult,
  deriveAtmosphericDeliveryState,
  friendlyReadinessMessage,
  reconcileAtmosphericReminderState,
  scheduleFailureMessage,
} from './deliveryState';
import { SCHEDULE_ID_KEY } from './atmosphericDelivery';

const storage = new Map<string, string>();
const cancelScheduledNotificationAsync = vi.hoisted(() => vi.fn(async () => undefined));
const getAllScheduledNotificationsAsync = vi.hoisted(() => vi.fn(async () => []));
const getPermissionsAsync = vi.hoisted(() => vi.fn(async () => ({ status: 'granted' })));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn(async (key: string) => storage.delete(key)),
  },
}));

vi.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  getPermissionsAsync,
}));

const preferences = {
  allEnabled: true,
  saleAlertsEnabled: false,
  horoscopesEnabled: true,
  transitsEnabled: false,
  dailyReminderEnabled: true,
  streakReminderEnabled: false,
  reEngagementEnabled: false,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  reminderHourLocal: 23,
} as NotificationPreferences;

describe('notification delivery state', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    getAllScheduledNotificationsAsync.mockResolvedValue([]);
    getPermissionsAsync.mockResolvedValue({ status: 'granted' });
  });

  it('derives quiet-hour adjusted delivery state copy', () => {
    const state = deriveAtmosphericDeliveryState({
      preferences,
      readiness: { canRequestPush: true, reason: null },
      permissionStatus: 'granted',
      scheduledISO: '2026-05-25T13:30:00.000Z',
      now: new Date('2026-05-25T08:00:00.000Z'),
      localPrefs: { silentModeEnabled: true, pausedUntilISO: null },
    });

    expect(state.scheduled).toBe(true);
    expect(state.quietHourAdjusted).toBe(true);
    expect(state.desiredHHMM).toBe('23:00');
    expect(state.scheduledHHMM).toBe('21:30');
    expect(state.quietHourMessage).toContain('respect your quiet hours');
    expect(state.statusText).toContain('Next ritual reminder');
  });

  it('shows permission denied state without scary technical copy', () => {
    const state = deriveAtmosphericDeliveryState({
      preferences,
      readiness: { canRequestPush: true, reason: null },
      permissionStatus: 'denied',
      now: new Date('2026-05-25T08:00:00.000Z'),
    });

    expect(state.statusText).toBe('Notifications are disabled in system settings');
    expect(state.detailText).not.toMatch(/expo|project/i);
  });

  it('shows paused state and resume time', () => {
    const state = deriveAtmosphericDeliveryState({
      preferences,
      readiness: { canRequestPush: true, reason: null },
      permissionStatus: 'granted',
      scheduledISO: '2026-05-25T13:30:00.000Z',
      now: new Date('2026-05-25T08:00:00.000Z'),
      localPrefs: { silentModeEnabled: false, pausedUntilISO: '2026-05-26T08:00:00.000Z' },
    });

    expect(state.paused).toBe(true);
    expect(state.scheduled).toBe(false);
    expect(state.statusText).toContain('Paused until');
  });

  it('maps unconfigured/simulator readiness into friendly user copy', () => {
    expect(friendlyReadinessMessage({ canRequestPush: false, reason: 'Push notifications require a physical device. Simulator/emulator is not supported.' })).toContain('simulator');
    expect(friendlyReadinessMessage({ canRequestPush: false, reason: 'Expo projectId is missing.' })).toContain('setup is incomplete');
  });

  it('cleans duplicate atmospheric reminders and recovers stale stored ids', async () => {
    await AsyncStorage.setItem(SCHEDULE_ID_KEY, 'missing-id');
    getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      {
        identifier: 'keep-id',
        content: { data: { kind: 'atmospheric_ritual' } },
        trigger: { date: new Date('2026-05-25T13:30:00.000Z') },
      },
      {
        identifier: 'cancel-id',
        content: { data: { kind: 'atmospheric_ritual' } },
        trigger: { date: new Date('2026-05-25T14:30:00.000Z') },
      },
      {
        identifier: 'other-id',
        content: { data: { kind: 'other' } },
        trigger: { date: new Date('2026-05-25T14:30:00.000Z') },
      },
    ] as never);

    const result = await reconcileAtmosphericReminderState();

    expect(result.active?.id).toBe('keep-id');
    expect(result.duplicateCleanupCount).toBe(1);
    expect(result.staleRecovered).toBe(true);
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('cancel-id');
    expect(await AsyncStorage.getItem(SCHEDULE_ID_KEY)).toBe('keep-id');
  });

  it('maps scheduling feedback into immediate user-facing copy', () => {
    expect(scheduleFailureMessage('permission_denied')).toContain('system settings');
    expect(
      deliveryFeedbackForScheduleResult({
        scheduled: true,
        notificationId: 'id',
        fireDateISO: '2026-05-25T13:30:00.000Z',
        copy: { title: 'Tonight feels clear', body: 'A small ritual may be enough.', reason: 'clarity' },
        quietHourAdjusted: true,
        desiredHHMM: '23:00',
        scheduledHHMM: '21:30',
      }).message,
    ).toContain('outside quiet hours');
  });
});
