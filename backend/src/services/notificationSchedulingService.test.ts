import { describe, expect, it } from 'vitest';
import {
  bestSendHour,
  isWithinQuietHours,
  notificationDedupeKey,
  shouldQueueRetentionNotification,
  streakReminderCopy,
  streakSegmentForNotification,
  type RetentionNotificationCandidate,
} from './notificationSchedulingService';

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
    expect(streakReminderCopy(1)).toBe('Your cosmic rhythm continues tonight \u2728');
    expect(streakReminderCopy(3)).toBe('Your cosmic rhythm is building \u2728');
    expect(streakReminderCopy(7)).toBe('7 nights aligned under the same stars \uD83C\uDF19');
    expect(streakReminderCopy(30)).toBe('Your ritual history is glowing.');
  });
});
