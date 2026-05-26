import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildStreakData,
  classifyStreakAnalyticsEvents,
  completeDailyRitual,
  currentStreakDateISO,
  nextStreakMilestone,
  recordDailyRitualStreak,
} from './streakService';

function createStreakDb(initial: {
  streakCount: number;
  longestStreakCount: number;
  streakLastDate: string | null;
  streakFreezes?: number;
  isPremium?: boolean;
}) {
  const row = { streakFreezes: 0, isPremium: false, ...initial };
  let lastChanges = 0;
  let includeChangesMeta = true;
  const history = new Set<string>();
  const run = vi.fn(async () => {
    if (run.mock.calls.length % 2 === 0) {
      history.add('2026-05-20');
      return { meta: { changes: 1 } };
    }
    const yesterdayForCount = '2026-05-19';
    const dayBeforeYesterday = '2026-05-18';
    const todayForSet = '2026-05-20';
    const todayForWhere = '2026-05-20';

    if (row.streakLastDate === todayForWhere) {
      lastChanges = 0;
      return { meta: { changes: 0 } };
    }

    const shouldUseFreeze = row.streakLastDate === dayBeforeYesterday && row.streakFreezes > 0;
    const nextCount = row.streakLastDate === yesterdayForCount ? row.streakCount + 1 : shouldUseFreeze ? row.streakCount : 1;
    const cap = row.isPremium ? 3 : 1;
    const shouldAwardFreeze = !shouldUseFreeze && [7, 30, 100].includes(nextCount) && row.streakFreezes < cap;
    row.streakCount = nextCount;
    row.longestStreakCount = Math.max(row.longestStreakCount, nextCount);
    if (shouldUseFreeze) row.streakFreezes -= 1;
    if (shouldAwardFreeze) row.streakFreezes += 1;
    row.streakLastDate = todayForSet ?? null;
    lastChanges = 1;
    return includeChangesMeta ? { meta: { changes: 1 } } : { meta: {} };
  });

  const get = vi.fn(async () => ({ ...row }));
  const db = {
    run,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ get })),
      })),
    })),
  };

  return {
    db: db as never,
    row,
    run,
    get,
    omitChangesMeta() {
      includeChangesMeta = false;
    },
    get lastChanges() {
      return lastChanges;
    },
    history,
  };
}

describe('recordDailyRitualStreak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a first-read streak at 1', async () => {
    const { db } = createStreakDb({ streakCount: 0, longestStreakCount: 0, streakLastDate: null });

    await expect(recordDailyRitualStreak(db, 'user-1', '2026-05-20')).resolves.toEqual({
      analyticsEvents: ['streak_started'],
      data: {
      streakCount: 1,
      longestStreakCount: 1,
      streakLastDate: '2026-05-20',
      streakFreezes: 0,
      streakFreezeAwarded: false,
      streakFreezeCap: 1,
      streakFreezeAwardReason: null,
      isNewStreakDay: true,
      streakPreservedByFreeze: false,
      milestoneReached: null,
      nextMilestone: 3,
      streakSegment: 'new',
      },
    });
  });

  it('does not increment repeated same-day reads', async () => {
    const { db } = createStreakDb({
      streakCount: 4,
      longestStreakCount: 4,
      streakLastDate: '2026-05-20',
    });

    await expect(recordDailyRitualStreak(db, 'user-1', '2026-05-20')).resolves.toMatchObject({ data: {
      streakCount: 4,
      longestStreakCount: 4,
      streakLastDate: '2026-05-20',
      isNewStreakDay: false,
      milestoneReached: null,
    } });
  });

  it('increments on the next day', async () => {
    const { db } = createStreakDb({
      streakCount: 2,
      longestStreakCount: 2,
      streakLastDate: '2026-05-19',
    });

    await expect(recordDailyRitualStreak(db, 'user-1', '2026-05-20')).resolves.toMatchObject({
      analyticsEvents: ['streak_milestone'],
      data: {
      streakCount: 3,
      longestStreakCount: 3,
      streakFreezes: 0,
      isNewStreakDay: true,
      milestoneReached: 3,
      nextMilestone: 7,
      streakSegment: 'building',
      },
    });
  });

  it('resets to 1 after a missed day while preserving the longest streak', async () => {
    const { db } = createStreakDb({
      streakCount: 8,
      longestStreakCount: 8,
      streakLastDate: '2026-05-17',
    });

    await expect(recordDailyRitualStreak(db, 'user-1', '2026-05-20')).resolves.toMatchObject({
      analyticsEvents: ['streak_lost'],
      data: {
      streakCount: 1,
      longestStreakCount: 8,
      streakLastDate: '2026-05-20',
      isNewStreakDay: true,
      milestoneReached: null,
      },
    });
  });

  it('updates longest streak when the current streak passes it', async () => {
    const { db } = createStreakDb({
      streakCount: 6,
      longestStreakCount: 6,
      streakLastDate: '2026-05-19',
    });

    await expect(recordDailyRitualStreak(db, 'user-1', '2026-05-20')).resolves.toMatchObject({ data: {
      streakCount: 7,
      longestStreakCount: 7,
      milestoneReached: 7,
      nextMilestone: 14,
    } });
  });

  it('only returns milestones on a newly recorded streak day', () => {
    expect(buildStreakData({ streakCount: 30, longestStreakCount: 30, streakLastDate: '2026-05-20', streakFreezes: 0 }, true))
      .toMatchObject({ milestoneReached: 30 });
    expect(buildStreakData({ streakCount: 30, longestStreakCount: 30, streakLastDate: '2026-05-20', streakFreezes: 0 }, false))
      .toMatchObject({ milestoneReached: null });
  });

  it('consumes a freeze and preserves the streak after exactly one missed day', async () => {
    const { db } = createStreakDb({
      streakCount: 8,
      longestStreakCount: 8,
      streakLastDate: '2026-05-18',
      streakFreezes: 2,
    });

    await expect(recordDailyRitualStreak(db, 'user-1', '2026-05-20')).resolves.toMatchObject({
      analyticsEvents: ['streak_freeze_used'],
      data: {
        streakCount: 8,
        longestStreakCount: 8,
        streakFreezes: 1,
        streakFreezeAwarded: false,
        streakPreservedByFreeze: true,
        milestoneReached: null,
        nextMilestone: 14,
      },
    });
  });

  it('caps freeze awards at 1 for free users', async () => {
    const { db } = createStreakDb({
      streakCount: 6,
      longestStreakCount: 6,
      streakLastDate: '2026-05-19',
      streakFreezes: 0,
      isPremium: false,
    });

    await expect(recordDailyRitualStreak(db, 'user-1', '2026-05-20')).resolves.toMatchObject({
      data: {
        streakCount: 7,
        streakFreezes: 1,
        streakFreezeAwarded: true,
        streakFreezeCap: 1,
        streakFreezeAwardReason: '7_day',
        streakSegment: 'aligned',
      },
    });
  });

  it('caps freeze awards at 3 for premium users', async () => {
    const { db } = createStreakDb({
      streakCount: 29,
      longestStreakCount: 29,
      streakLastDate: '2026-05-19',
      streakFreezes: 2,
      isPremium: true,
    });

    await expect(recordDailyRitualStreak(db, 'user-1', '2026-05-20')).resolves.toMatchObject({
      data: {
        streakCount: 30,
        streakFreezes: 3,
        streakFreezeAwarded: true,
        streakFreezeCap: 3,
        streakFreezeAwardReason: '30_day',
        streakSegment: 'devoted',
      },
    });
  });

  it('does not award a freeze when already at cap', async () => {
    const { db } = createStreakDb({
      streakCount: 99,
      longestStreakCount: 99,
      streakLastDate: '2026-05-19',
      streakFreezes: 3,
      isPremium: true,
    });

    await expect(recordDailyRitualStreak(db, 'user-1', '2026-05-20')).resolves.toMatchObject({
      data: {
        streakCount: 100,
        streakFreezes: 3,
        streakFreezeAwarded: false,
        streakFreezeCap: 3,
        streakFreezeAwardReason: null,
        streakSegment: 'legendary',
      },
    });
  });

  it('returns the 365-day milestone without awarding an extra freeze', async () => {
    const { db } = createStreakDb({
      streakCount: 364,
      longestStreakCount: 364,
      streakLastDate: '2026-05-19',
      streakFreezes: 1,
      isPremium: true,
    });

    await expect(recordDailyRitualStreak(db, 'user-1', '2026-05-20')).resolves.toMatchObject({
      data: {
        streakCount: 365,
        milestoneReached: 365,
        nextMilestone: null,
        streakFreezeAwarded: false,
        streakFreezeAwardReason: null,
      },
    });
  });

  it('returns completion state for a first daily ritual completion', async () => {
    const { db } = createStreakDb({ streakCount: 0, longestStreakCount: 0, streakLastDate: null });

    await expect(completeDailyRitual(db, 'user-1', '2026-05-20')).resolves.toMatchObject({
      completion: {
        currentStreak: 1,
        longestStreak: 1,
        freezeCount: 0,
        freezeCap: 1,
        nextMilestone: 3,
        milestoneReached: null,
        streakFreezeAwarded: false,
        alreadyCompletedToday: false,
        shouldCelebrate: true,
        completedDate: '2026-05-20',
      },
    });
  });

  it('returns replay-safe completion state for repeated same-day completion', async () => {
    const capture = createStreakDb({
      streakCount: 6,
      longestStreakCount: 6,
      streakLastDate: '2026-05-19',
      streakFreezes: 0,
    });

    await completeDailyRitual(capture.db, 'user-1', '2026-05-20');
    await expect(completeDailyRitual(capture.db, 'user-1', '2026-05-20')).resolves.toMatchObject({
      completion: {
        currentStreak: 7,
        freezeCount: 1,
        milestoneReached: null,
        streakFreezeAwarded: false,
        alreadyCompletedToday: true,
        shouldCelebrate: false,
        completedDate: '2026-05-20',
      },
      analyticsEvents: [],
    });
  });

  it('does not duplicate freeze awards or history rows on repeated same-day reads', async () => {
    const capture = createStreakDb({
      streakCount: 6,
      longestStreakCount: 6,
      streakLastDate: '2026-05-19',
      streakFreezes: 0,
    });

    await recordDailyRitualStreak(capture.db, 'user-1', '2026-05-20');
    await expect(recordDailyRitualStreak(capture.db, 'user-1', '2026-05-20')).resolves.toMatchObject({
      data: {
        streakCount: 7,
        streakFreezes: 1,
        streakFreezeAwarded: false,
        milestoneReached: null,
      },
      analyticsEvents: [],
    });
    expect(capture.history.size).toBe(1);
  });

  it('resets normally when freezes are exhausted', async () => {
    const { db } = createStreakDb({
      streakCount: 8,
      longestStreakCount: 8,
      streakLastDate: '2026-05-18',
      streakFreezes: 0,
    });

    await expect(recordDailyRitualStreak(db, 'user-1', '2026-05-20')).resolves.toMatchObject({
      analyticsEvents: ['streak_lost'],
      data: {
        streakCount: 1,
        longestStreakCount: 8,
        streakFreezes: 0,
        streakPreservedByFreeze: false,
      },
    });
  });

  it('falls back to before/after rows when D1 changes metadata is missing', async () => {
    const capture = createStreakDb({
      streakCount: 2,
      longestStreakCount: 2,
      streakLastDate: '2026-05-19',
    });
    capture.omitChangesMeta();

    await expect(recordDailyRitualStreak(capture.db, 'user-1', '2026-05-20')).resolves.toMatchObject({ data: {
      streakCount: 3,
      isNewStreakDay: true,
      milestoneReached: 3,
    } });
  });

  it('uses UTC for streak date rollover', () => {
    expect(currentStreakDateISO(new Date('2026-05-19T23:59:59.999Z'))).toBe('2026-05-19');
    expect(currentStreakDateISO(new Date('2026-05-20T00:00:00.000Z'))).toBe('2026-05-20');
  });

  it('calculates the next milestone', () => {
    expect(nextStreakMilestone(0)).toBe(3);
    expect(nextStreakMilestone(7)).toBe(14);
    expect(nextStreakMilestone(100)).toBe(365);
    expect(nextStreakMilestone(365)).toBeNull();
  });

  it('does not emit milestone analytics for repeated same-day reads', () => {
    expect(
      classifyStreakAnalyticsEvents(
        { streakCount: 7, longestStreakCount: 7, streakLastDate: '2026-05-20', streakFreezes: 0 },
        buildStreakData(
          { streakCount: 7, longestStreakCount: 7, streakLastDate: '2026-05-20', streakFreezes: 0 },
          false,
        ),
      ),
    ).toEqual([]);
  });
});
