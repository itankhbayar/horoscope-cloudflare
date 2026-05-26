import { eq, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { users } from '../db/schema';

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];
export const STREAK_FREEZE_AWARD_MILESTONES = [7, 30, 100] as const;
export type StreakFreezeAwardReason = '7_day' | '30_day' | '100_day';
export type StreakSegment = 'new' | 'building' | 'aligned' | 'devoted' | 'legendary';

export interface StreakData {
  streakCount: number;
  longestStreakCount: number;
  streakLastDate: string | null;
  streakFreezes: number;
  streakFreezeAwarded: boolean;
  streakFreezeCap: number;
  streakFreezeAwardReason: StreakFreezeAwardReason | null;
  isNewStreakDay: boolean;
  streakPreservedByFreeze: boolean;
  milestoneReached: StreakMilestone | null;
  nextMilestone: StreakMilestone | null;
  streakSegment: StreakSegment;
}

interface UserStreakRow {
  streakCount: number;
  longestStreakCount: number;
  streakLastDate: string | null;
  streakFreezes: number;
  isPremium?: boolean | number;
}

export type StreakAnalyticsEvent = 'streak_started' | 'streak_milestone' | 'streak_freeze_used' | 'streak_lost';

export interface StreakUpdateResult {
  data: StreakData;
  analyticsEvents: StreakAnalyticsEvent[];
}

export interface DailyRitualCompletionResult {
  currentStreak: number;
  longestStreak: number;
  freezeCount: number;
  freezeCap: number;
  nextMilestone: StreakMilestone | null;
  milestoneReached: StreakMilestone | null;
  streakFreezeAwarded: boolean;
  alreadyCompletedToday: boolean;
  shouldCelebrate: boolean;
  completedDate: string;
  streakLastDate: string | null;
  streakPreservedByFreeze: boolean;
  streakFreezeAwardReason: StreakFreezeAwardReason | null;
  streakSegment: StreakSegment;
}

function previousDateISO(dateISO: string): string {
  const previous = new Date(`${dateISO}T00:00:00.000Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
}

export function currentStreakDateISO(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function subtractDaysISO(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function nextStreakMilestone(count: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((milestone) => milestone > count) ?? null;
}

export function streakSegmentFor(count: number): StreakSegment {
  if (count >= 100) return 'legendary';
  if (count >= 30) return 'devoted';
  if (count >= 7) return 'aligned';
  if (count >= 3) return 'building';
  return 'new';
}

export function streakFreezeCap(isPremium: boolean): number {
  return isPremium ? 3 : 1;
}

export function freezeAwardReasonFor(milestone: StreakMilestone | null): StreakFreezeAwardReason | null {
  if (milestone === 7) return '7_day';
  if (milestone === 30) return '30_day';
  if (milestone === 100) return '100_day';
  return null;
}

export function milestoneFor(count: number, isNewStreakDay: boolean): StreakMilestone | null {
  if (!isNewStreakDay) return null;
  return STREAK_MILESTONES.includes(count as StreakMilestone) ? (count as StreakMilestone) : null;
}

function changesFromRun(result: unknown): number | null {
  const changes = (result as { meta?: { changes?: unknown; rows_written?: unknown } }).meta?.changes;
  if (typeof changes === 'number') return changes;
  const rowsWritten = (result as { meta?: { rows_written?: unknown } }).meta?.rows_written;
  return typeof rowsWritten === 'number' ? rowsWritten : null;
}

export function buildStreakData(
  row: UserStreakRow,
  isNewStreakDay: boolean,
  streakPreservedByFreeze = false,
  milestoneEligible = isNewStreakDay,
  streakFreezeAwarded = false,
): StreakData {
  const milestoneReached = milestoneFor(row.streakCount, milestoneEligible);
  const isPremium = Boolean(row.isPremium);
  return {
    streakCount: row.streakCount,
    longestStreakCount: row.longestStreakCount,
    streakLastDate: row.streakLastDate,
    streakFreezes: row.streakFreezes,
    streakFreezeAwarded,
    streakFreezeCap: streakFreezeCap(isPremium),
    streakFreezeAwardReason: streakFreezeAwarded ? freezeAwardReasonFor(milestoneReached) : null,
    isNewStreakDay,
    streakPreservedByFreeze,
    milestoneReached,
    nextMilestone: nextStreakMilestone(row.streakCount),
    streakSegment: streakSegmentFor(row.streakCount),
  };
}

export async function recordDailyRitualStreak(
  db: DB,
  userId: string,
  todayISO: string,
): Promise<StreakUpdateResult> {
  const yesterdayISO = previousDateISO(todayISO);
  const dayBeforeYesterdayISO = subtractDaysISO(todayISO, 2);
  const before = await db
    .select({
      streakCount: users.streakCount,
      longestStreakCount: users.longestStreakCount,
      streakLastDate: users.streakLastDate,
      streakFreezes: users.streakFreezes,
      isPremium: users.isPremium,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  const result = await db.run(sql`
    UPDATE users
    SET
      streak_count = CASE
        WHEN streak_last_date = ${yesterdayISO} THEN streak_count + 1
        WHEN streak_last_date = ${dayBeforeYesterdayISO} AND streak_freezes > 0 THEN streak_count
        ELSE 1
      END,
      longest_streak_count = max(
        longest_streak_count,
        CASE
          WHEN streak_last_date = ${yesterdayISO} THEN streak_count + 1
          WHEN streak_last_date = ${dayBeforeYesterdayISO} AND streak_freezes > 0 THEN streak_count
          ELSE 1
        END
      ),
      streak_freezes = CASE
        WHEN streak_last_date = ${dayBeforeYesterdayISO} AND streak_freezes > 0 THEN streak_freezes - 1
        WHEN (
          CASE
            WHEN streak_last_date = ${yesterdayISO} THEN streak_count + 1
            WHEN streak_last_date = ${dayBeforeYesterdayISO} AND streak_freezes > 0 THEN streak_count
            ELSE 1
          END
        ) IN (7, 30, 100)
          AND NOT (streak_last_date = ${dayBeforeYesterdayISO} AND streak_freezes > 0)
          AND streak_freezes < CASE WHEN is_premium THEN 3 ELSE 1 END
        THEN streak_freezes + 1
        ELSE streak_freezes
      END,
      streak_last_date = ${todayISO},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
      AND (streak_last_date IS NULL OR streak_last_date <> ${todayISO})
  `);

  const row = await db
    .select({
      streakCount: users.streakCount,
      longestStreakCount: users.longestStreakCount,
      streakLastDate: users.streakLastDate,
      streakFreezes: users.streakFreezes,
      isPremium: users.isPremium,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  const changes = changesFromRun(result);
  const isNewStreakDay =
    changes !== null
      ? changes > 0
      : before?.streakLastDate !== todayISO && row?.streakLastDate === todayISO;
  const streakPreservedByFreeze = Boolean(
    isNewStreakDay &&
      before?.streakLastDate === dayBeforeYesterdayISO &&
      (before.streakFreezes ?? 0) > 0 &&
      row?.streakCount === before.streakCount,
  );
  const milestoneEligible = Boolean(isNewStreakDay && !streakPreservedByFreeze && row?.streakCount !== before?.streakCount);
  const streakFreezeAwarded = Boolean(
    milestoneEligible &&
      freezeAwardReasonFor(milestoneFor(row?.streakCount ?? 0, true)) &&
      before &&
      row &&
      row.streakFreezes === before.streakFreezes + 1,
  );
  const normalizedRow = row ?? {
    streakCount: 0,
    longestStreakCount: 0,
    streakLastDate: null,
    streakFreezes: 0,
    isPremium: false,
  };
  if (row?.streakLastDate === todayISO) {
    await db.run(sql`
      INSERT OR IGNORE INTO daily_ritual_history (id, user_id, ritual_date)
      VALUES (${crypto.randomUUID()}, ${userId}, ${todayISO})
    `);
  }
  const data = buildStreakData(
    normalizedRow,
    isNewStreakDay,
    streakPreservedByFreeze,
    milestoneEligible,
    streakFreezeAwarded,
  );
  const analyticsEvents = classifyStreakAnalyticsEvents(before, data);

  return { data, analyticsEvents };
}

export async function getCurrentStreakData(db: DB, userId: string): Promise<StreakData> {
  const row = await db
    .select({
      streakCount: users.streakCount,
      longestStreakCount: users.longestStreakCount,
      streakLastDate: users.streakLastDate,
      streakFreezes: users.streakFreezes,
      isPremium: users.isPremium,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  return buildStreakData(
    row ?? {
      streakCount: 0,
      longestStreakCount: 0,
      streakLastDate: null,
      streakFreezes: 0,
      isPremium: false,
    },
    false,
  );
}

export function toDailyRitualCompletionResult(
  update: StreakUpdateResult,
  completedDate: string,
): DailyRitualCompletionResult {
  const { data } = update;
  const alreadyCompletedToday = !data.isNewStreakDay && data.streakLastDate === completedDate;
  return {
    currentStreak: data.streakCount,
    longestStreak: data.longestStreakCount,
    freezeCount: data.streakFreezes,
    freezeCap: data.streakFreezeCap,
    nextMilestone: data.nextMilestone,
    milestoneReached: data.milestoneReached,
    streakFreezeAwarded: data.streakFreezeAwarded,
    alreadyCompletedToday,
    shouldCelebrate: data.isNewStreakDay,
    completedDate,
    streakLastDate: data.streakLastDate,
    streakPreservedByFreeze: data.streakPreservedByFreeze,
    streakFreezeAwardReason: data.streakFreezeAwardReason,
    streakSegment: data.streakSegment,
  };
}

export async function completeDailyRitual(
  db: DB,
  userId: string,
  ritualDateISO: string,
): Promise<StreakUpdateResult & { completion: DailyRitualCompletionResult }> {
  const update = await recordDailyRitualStreak(db, userId, ritualDateISO);
  return {
    ...update,
    completion: toDailyRitualCompletionResult(update, ritualDateISO),
  };
}

export function classifyStreakAnalyticsEvents(
  before: UserStreakRow | undefined,
  after: StreakData,
): StreakAnalyticsEvent[] {
  if (!after.isNewStreakDay) return [];
  if (after.streakPreservedByFreeze) return ['streak_freeze_used'];
  if ((!before?.streakCount || before.streakCount <= 0) && after.streakCount === 1) return ['streak_started'];
  if ((before?.streakCount ?? 0) > 1 && after.streakCount === 1) return ['streak_lost'];
  if (after.milestoneReached) return ['streak_milestone'];
  return [];
}
