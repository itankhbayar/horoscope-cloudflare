import { and, eq, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { dailyReflections, dailyRitualHistory } from '../db/schema';

/**
 * Accuracy Loop — evening check-in persistence. One resonance rating per user per
 * reading-day, stored as a small integer (1 didn't land · 2 partly · 3 this was my
 * day). The unique (userId, readingDate) index makes submit an idempotent upsert.
 */

export type Resonance = 1 | 2 | 3;

export interface ReflectionRecord {
  readingDate: string;
  resonance: Resonance;
}

export interface ReflectionSubmitResult {
  readingDate: string;
  resonance: Resonance;
  /** True when a rating already existed for this reading-day (an overwrite). */
  alreadyExisted: boolean;
}

export interface ReflectionState {
  todayCheckIn: ReflectionRecord | null;
  yesterday: ReflectionRecord | null;
  /** Revealed today's reading and has not yet checked in — drives the evening nudge + card. */
  checkInPending: boolean;
}

export function isResonance(value: unknown): value is Resonance {
  return value === 1 || value === 2 || value === 3;
}

/** Previous calendar day for an ISO date string (UTC math; date strings are date-only). */
export function previousDateISO(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function toRecord(row: { readingDate: string; resonance: number } | undefined | null): ReflectionRecord | null {
  if (!row || !isResonance(row.resonance)) return null;
  return { readingDate: row.readingDate, resonance: row.resonance };
}

export async function getReflection(db: DB, userId: string, readingDate: string): Promise<ReflectionRecord | null> {
  const row = await db
    .select({ readingDate: dailyReflections.readingDate, resonance: dailyReflections.resonance })
    .from(dailyReflections)
    .where(and(eq(dailyReflections.userId, userId), eq(dailyReflections.readingDate, readingDate)))
    .get();
  return toRecord(row);
}

/** Did the user reveal the daily reading for this date? (reuses the ritual-history row). */
export async function hasRevealedReading(db: DB, userId: string, readingDate: string): Promise<boolean> {
  const row = await db
    .select({ id: dailyRitualHistory.id })
    .from(dailyRitualHistory)
    .where(and(eq(dailyRitualHistory.userId, userId), eq(dailyRitualHistory.ritualDate, readingDate)))
    .get();
  return Boolean(row);
}

export async function submitReflection(
  db: DB,
  userId: string,
  readingDate: string,
  resonance: Resonance,
): Promise<ReflectionSubmitResult> {
  const existing = await getReflection(db, userId, readingDate);
  await db.run(sql`
    INSERT INTO daily_reflections (id, user_id, reading_date, resonance)
    VALUES (${crypto.randomUUID()}, ${userId}, ${readingDate}, ${resonance})
    ON CONFLICT(user_id, reading_date) DO UPDATE SET resonance = excluded.resonance
  `);
  return { readingDate, resonance, alreadyExisted: existing !== null };
}

export async function getReflectionState(db: DB, userId: string, todayISO: string): Promise<ReflectionState> {
  const yesterdayISO = previousDateISO(todayISO);
  const todayCheckIn = await getReflection(db, userId, todayISO);
  const yesterday = await getReflection(db, userId, yesterdayISO);
  const revealedToday = await hasRevealedReading(db, userId, todayISO);
  return {
    todayCheckIn,
    yesterday,
    checkInPending: revealedToday && todayCheckIn === null,
  };
}
