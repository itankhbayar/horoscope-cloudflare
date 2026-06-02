import { describe, expect, it } from 'vitest';
import {
  bestSendHour,
  copyForKind,
  dailyReminderCopy,
  daysBetweenISO,
  isWithinQuietHours,
  isWinBackDay,
  localDateISOInTimezone,
  localHourInTimezone,
  notificationDedupeKey,
  previousDateISO,
  selectNotificationKind,
  shouldQueueRetentionNotification,
  streakReminderCopy,
  streakSegmentForNotification,
  type RetentionNotificationCandidate,
} from './notificationSchedulingService';
import { buildGlobalSkyToday } from './globalSkyService';
import { getZodiacInfo } from '../utils/zodiac';
import { pushTeaserForTheme, selectHookTheme } from '../utils/dailyHook';

const base: RetentionNotificationCandidate = {
  kind: 'daily_horoscope',
  userId: 'user-1',
  timezone: 'Asia/Ulaanbaatar',
  localHour: 9,
  quietHours: { enabled: true, start: '21:00', end: '08:00' },
  preferenceEnabled: true,
  allEnabled: true,
  tokenEnabled: true,
  dedupeKey: 'user-1:daily_horoscope:2026-05-23',
};

describe('notification scheduling rules', () => {
  it('respects overnight quiet hours', () => {
    expect(isWithinQuietHours(22, base.quietHours)).toBe(true);
    expect(isWithinQuietHours(7, base.quietHours)).toBe(true);
    expect(isWithinQuietHours(9, base.quietHours)).toBe(false);
  });

  it('queues only opted-in, token-backed notifications outside quiet hours', () => {
    expect(shouldQueueRetentionNotification(base)).toBe(true);
    expect(shouldQueueRetentionNotification({ ...base, allEnabled: false })).toBe(false);
    expect(shouldQueueRetentionNotification({ ...base, preferenceEnabled: false })).toBe(false);
    expect(shouldQueueRetentionNotification({ ...base, tokenEnabled: false })).toBe(false);
    expect(shouldQueueRetentionNotification({ ...base, localHour: 23 })).toBe(false);
  });

  it('uses one dedupe key per user, kind, and local date', () => {
    expect(notificationDedupeKey('user-1', 'streak_reminder', '2026-05-23')).toBe(
      'user-1:streak_reminder:2026-05-23',
    );
  });

  it('uses saved reminder hour as deterministic best-send-hour foundation', () => {
    expect(bestSendHour(20)).toBe(20);
    expect(bestSendHour(24)).toBe(9);
    expect(bestSendHour(undefined)).toBe(9);
  });

  it('selects soft streak-aware reminder copy by segment', () => {
    expect(streakSegmentForNotification(1)).toBe('new');
    expect(streakSegmentForNotification(3)).toBe('building');
    expect(streakSegmentForNotification(7)).toBe('aligned');
    expect(streakSegmentForNotification(30)).toBe('devoted');
    expect(streakSegmentForNotification(100)).toBe('legendary');
    expect(streakReminderCopy(1)).toBe("Today's reading is ready.");
    expect(streakReminderCopy(3)).toBe('Your sky is waiting.');
    expect(streakReminderCopy(7)).toBe('Your sky is waiting.');
    expect(streakReminderCopy(30)).toBe("Reveal today's horoscope.");
  });
});

describe('notification kind selection', () => {
  const baseInput = {
    localDate: '2026-05-23',
    streakCount: 0,
    streakLastDate: null as string | null,
    dailyReminderEnabled: true,
    streakReminderEnabled: true,
    reEngagementEnabled: true,
  };

  it('sends nothing once the user has engaged today', () => {
    expect(selectNotificationKind({ ...baseInput, streakLastDate: '2026-05-23' })).toBeNull();
  });

  it('rescues a streak that is exactly one day from breaking', () => {
    expect(
      selectNotificationKind({ ...baseInput, streakCount: 5, streakLastDate: '2026-05-22' }),
    ).toBe('streak_reminder');
  });

  it('falls back to the daily reminder when no streak is at risk', () => {
    expect(selectNotificationKind(baseInput)).toBe('daily_horoscope');
  });

  it('prioritizes win-back on a lapse-ladder day', () => {
    // 7 days inactive (2026-05-16 -> 2026-05-23) is a win-back day, outranks streak/daily.
    expect(
      selectNotificationKind({ ...baseInput, streakCount: 9, streakLastDate: '2026-05-16' }),
    ).toBe('re_engagement');
  });

  it('does not win-back on an off-ladder lapse day', () => {
    // 5 days inactive is not in the ladder; streak is stale (not yesterday) -> daily.
    expect(
      selectNotificationKind({ ...baseInput, streakCount: 9, streakLastDate: '2026-05-18' }),
    ).toBe('daily_horoscope');
  });

  it('respects disabled per-kind preferences', () => {
    expect(
      selectNotificationKind({ ...baseInput, dailyReminderEnabled: false }),
    ).toBeNull();
    expect(
      selectNotificationKind({
        ...baseInput,
        streakCount: 5,
        streakLastDate: '2026-05-22',
        streakReminderEnabled: false,
      }),
    ).toBe('daily_horoscope');
  });

  it('computes win-back ladder days and date math', () => {
    expect(isWinBackDay(7)).toBe(true);
    expect(isWinBackDay(5)).toBe(false);
    expect(isWinBackDay(null)).toBe(false);
    expect(daysBetweenISO('2026-05-16', '2026-05-23')).toBe(7);
    expect(previousDateISO('2026-05-23')).toBe('2026-05-22');
  });
});

describe('timezone helpers', () => {
  it('derives local hour and date for a timezone', () => {
    // 2026-05-23T16:30:00Z is 2026-05-24 00:30 in Asia/Ulaanbaatar (UTC+8).
    const at = new Date('2026-05-23T16:30:00.000Z');
    expect(localHourInTimezone(at, 'Asia/Ulaanbaatar')).toBe(0);
    expect(localDateISOInTimezone(at, 'Asia/Ulaanbaatar')).toBe('2026-05-24');
    expect(localHourInTimezone(at, 'UTC')).toBe(16);
  });

  it('falls back to UTC for an invalid timezone', () => {
    const at = new Date('2026-05-23T16:30:00.000Z');
    expect(localHourInTimezone(at, 'Not/AZone')).toBe(16);
  });
});

describe('copyForKind', () => {
  it('produces distinct copy per kind', () => {
    const daily = copyForKind('daily_horoscope', { sky: null, streakCount: 0, inactiveDays: null });
    const streak = copyForKind('streak_reminder', { sky: null, streakCount: 5, inactiveDays: null });
    const winback = copyForKind('re_engagement', { sky: null, streakCount: 0, inactiveDays: 7 });
    expect(daily.title).not.toBe(streak.title);
    expect(streak.title).toContain('5');
    expect(winback.body.length).toBeGreaterThan(0);
  });
});

describe('dailyReminderCopy push/in-app theme alignment', () => {
  it('teases the same Moon-derived emotional theme the in-app reading opens with', () => {
    const sky = buildGlobalSkyToday('2026-05-20');
    const theme = selectHookTheme(getZodiacInfo(sky.moonSign).element, sky.moonPhase);
    expect(dailyReminderCopy(sky)).toEqual(pushTeaserForTheme(theme));
  });

  it('falls back to a safe default when no sky snapshot is available', () => {
    const copy = dailyReminderCopy(null);
    expect(copy.title.length).toBeGreaterThan(0);
    expect(copy.body.length).toBeGreaterThan(0);
  });
});
