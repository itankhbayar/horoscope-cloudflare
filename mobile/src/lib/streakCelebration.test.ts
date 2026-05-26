import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumeDailyRitualCelebration,
  consumeMilestoneCelebration,
  dailyRitualCelebrationKey,
  milestoneCelebrationKey,
} from './streakCelebration';

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
  },
}));

describe('streak milestone celebration persistence', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('allows a milestone celebration once for a streak date', async () => {
    await expect(consumeMilestoneCelebration(7, '2026-05-20')).resolves.toBe(7);
    await expect(consumeMilestoneCelebration(7, '2026-05-20')).resolves.toBeNull();
  });

  it('uses the milestone date in the seen key', () => {
    expect(milestoneCelebrationKey(30, '2026-05-20')).toBe(
      'engagement:streak-milestone-seen:2026-05-20:30',
    );
  });

  it('does not celebrate incomplete milestone payloads', async () => {
    await expect(consumeMilestoneCelebration(null, '2026-05-20')).resolves.toBeNull();
    await expect(consumeMilestoneCelebration(3, null)).resolves.toBeNull();
  });

  it('allows a daily ritual completion celebration once for a completed date', async () => {
    expect(dailyRitualCelebrationKey('2026-05-20')).toBe(
      'engagement:daily-ritual-completion-seen:2026-05-20',
    );
    await expect(consumeDailyRitualCelebration('2026-05-20')).resolves.toBe(true);
    await expect(consumeDailyRitualCelebration('2026-05-20')).resolves.toBe(false);
  });
});
