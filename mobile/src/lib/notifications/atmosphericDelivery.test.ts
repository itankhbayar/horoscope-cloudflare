import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __setLocaleForTests } from '../../i18n';
import {
  buildAtmosphericNotificationCopy,
  isInsideQuietHours,
  nextAtmosphericReminderDate,
  notificationCopyIsSafe,
  resolveReminderHHMM,
  scheduleAtmosphericReminder,
} from './atmosphericDelivery';
import type { GlobalSkyToday } from '@astralis/lib/types';

const storage = new Map<string, string>();
const scheduleNotificationAsync = vi.hoisted(() => vi.fn(async () => 'local-id'));
const cancelScheduledNotificationAsync = vi.hoisted(() => vi.fn(async () => undefined));
const getPermissionsAsync = vi.hoisted(() => vi.fn(async () => ({ status: 'granted' })));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn(async (key: string) => storage.delete(key)),
  },
}));

vi.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  getPermissionsAsync,
}));

const sky: GlobalSkyToday = {
  date: '2026-05-25',
  moonSign: 'scorpio',
  moonPhase: 'Waning Gibbous',
  headline: 'The Moon in Scorpio makes the emotional subtext harder to ignore.',
  summary: 'A reflective sky.',
  cards: [],
  atmosphere: {
    tension: 70,
    intimacy: 55,
    clarity: 48,
    momentum: 30,
    uncertainty: 44,
    reflection: 66,
    socialOpenness: 28,
    emotionalVolatility: 52,
  },
  majorAspects: [],
  mercuryActivity: 'Mercury is steady.',
  venusMarsTension: null,
  retrogradeBodies: [],
  eclipseWindow: { active: false, note: 'No eclipse window.' },
  shareLine: 'A reflective sky.',
};

const prefs = {
  reminderHourLocal: 21,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  silentModeEnabled: false,
  pausedUntilISO: null,
};

describe('atmospheric notification delivery', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    __setLocaleForTests('en');
    getPermissionsAsync.mockResolvedValue({ status: 'granted' });
  });

  it('detects quiet hours including overnight windows', () => {
    expect(isInsideQuietHours('23:00', prefs)).toBe(true);
    expect(isInsideQuietHours('07:30', prefs)).toBe(true);
    expect(isInsideQuietHours('20:30', prefs)).toBe(false);
  });

  it('moves reminder timing before quiet hours when needed', () => {
    expect(resolveReminderHHMM({ ...prefs, reminderHourLocal: 23 })).toBe('21:30');
    expect(resolveReminderHHMM({ ...prefs, reminderHourLocal: 20 })).toBe('20:00');
  });

  it('returns null reminder date while paused', () => {
    expect(
      nextAtmosphericReminderDate(new Date('2026-05-25T10:00:00'), {
        ...prefs,
        pausedUntilISO: '2026-05-26T10:00:00.000Z',
      }),
    ).toBeNull();
  });

  it('builds calm copy without guilt or urgency', () => {
    const copy = buildAtmosphericNotificationCopy(sky, null);

    expect(copy.title).toMatch(/emotionally direct/i);
    expect(notificationCopyIsSafe(copy)).toBe(true);
  });

  it('schedules a local notification only when enabled and permission is granted', async () => {
    const result = await scheduleAtmosphericReminder({ enabled: true, prefs, sky, memory: null });

    expect(result.scheduled).toBe(true);
    expect(scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({
        data: expect.objectContaining({ kind: 'atmospheric_ritual' }),
      }),
    }));
  });

  it('does not schedule when permission is denied', async () => {
    getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

    const result = await scheduleAtmosphericReminder({ enabled: true, prefs, sky, memory: null });

    expect(result).toEqual({ scheduled: false, reason: 'permission_denied' });
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
