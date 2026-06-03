import { sql } from 'drizzle-orm';
import type { DB } from '../db/client';

/** Rows actually written by a D1 statement, across changes / rows_written shapes. */
function changesFromRun(result: unknown): number {
  const meta = (result as { meta?: { changes?: unknown; rows_written?: unknown } }).meta;
  if (typeof meta?.changes === 'number') return meta.changes;
  if (typeof meta?.rows_written === 'number') return meta.rows_written;
  return 0;
}

/**
 * Atomically claim the user's "first horoscope revealed" activation milestone.
 *
 * Returns `true` only for the single request that flips `first_horoscope_revealed_at`
 * from NULL to now; every later reveal (same device, another device, after logout/login,
 * after reinstall) returns `false`. The guarantee comes from the conditional UPDATE: SQLite
 * serializes writes and re-evaluates `IS NULL` at execution time, so exactly one statement
 * can match the row. The marker lives on the user row, so it is server-authoritative and
 * never depends on client/local storage.
 *
 * Streak, ritual, Pattern Memory, trial, and push logic are intentionally untouched — this
 * only reads/sets a dedicated activation marker.
 */
export async function markFirstHoroscopeReveal(db: DB, userId: string): Promise<boolean> {
  const result = await db.run(sql`
    UPDATE users
    SET first_horoscope_revealed_at = CURRENT_TIMESTAMP
    WHERE id = ${userId} AND first_horoscope_revealed_at IS NULL
  `);
  return changesFromRun(result) === 1;
}
