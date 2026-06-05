import { describe, expect, it } from 'vitest';
import {
  copyForKind,
  eveningReflectionCopy,
  EVENING_REFLECTION_HOUR_LOCAL,
  notificationDedupeKey,
} from './notificationSchedulingService';

describe('evening reflection scheduling', () => {
  it('sends in the evening, separate from the morning daily reminder', () => {
    expect(EVENING_REFLECTION_HOUR_LOCAL).toBeGreaterThanOrEqual(18);
    expect(EVENING_REFLECTION_HOUR_LOCAL).toBeLessThanOrEqual(22);
    // Default morning reminder hour is 9 — the two windows must not collide.
    expect(EVENING_REFLECTION_HOUR_LOCAL).not.toBe(9);
  });

  it('copyForKind routes evening_reflection to its dedicated copy', () => {
    const copy = copyForKind('evening_reflection', { sky: null, streakCount: 5, inactiveDays: null });
    expect(copy).toEqual(eveningReflectionCopy());
    expect(copy.title.length).toBeGreaterThan(0);
    expect(copy.body.length).toBeGreaterThan(0);
  });

  it('builds a stable per-user, per-day dedupe key', () => {
    expect(notificationDedupeKey('user-1', 'evening_reflection', '2026-06-04')).toBe(
      'user-1:evening_reflection:2026-06-04',
    );
  });
});
