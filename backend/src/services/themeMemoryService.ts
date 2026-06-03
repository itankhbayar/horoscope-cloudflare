import { and, eq, gte, lt, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { userThemeHistory } from '../db/schema';
import type { HookTheme } from '../utils/dailyHook';
import type { Lang } from '../utils/lang';
import {
  buildPatternMemoryBlock,
  daysBetweenISO,
  PATTERN_MEMORY_RETENTION_DAYS,
  type PatternMemoryBlock,
  type ThemeHistoryEntry,
} from '../utils/patternMemory';

function shiftDateISO(dateISO: string, days: number): string {
  const ms = Date.parse(`${dateISO}T00:00:00.000Z`);
  if (Number.isNaN(ms)) return dateISO;
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Persist today's hook theme for a user (idempotent — the theme is deterministic per
 * day, so re-reads keep the first stored value). Stores only the keyword + date.
 */
export async function recordDailyTheme(
  db: DB,
  userId: string,
  dateISO: string,
  theme: HookTheme,
): Promise<void> {
  await db.run(sql`
    INSERT OR IGNORE INTO user_theme_history (id, user_id, theme, theme_date)
    VALUES (${crypto.randomUUID()}, ${userId}, ${theme}, ${dateISO})
  `);
}

/** Read prior theme entries inside the 14-day retention window (today excluded). */
export async function getRecentThemeHistory(
  db: DB,
  userId: string,
  todayISO: string,
): Promise<ThemeHistoryEntry[]> {
  const cutoff = shiftDateISO(todayISO, -PATTERN_MEMORY_RETENTION_DAYS);
  const rows = await db
    .select({ theme: userThemeHistory.theme, date: userThemeHistory.themeDate })
    .from(userThemeHistory)
    .where(
      and(
        eq(userThemeHistory.userId, userId),
        gte(userThemeHistory.themeDate, cutoff),
        lt(userThemeHistory.themeDate, todayISO),
      ),
    )
    .all();
  return rows.map((row) => ({ theme: row.theme as HookTheme, date: row.date }));
}

/** Delete entries beyond the retention window so the table stays tiny. */
export async function pruneThemeHistoryForUser(
  db: DB,
  userId: string,
  todayISO: string,
): Promise<void> {
  const cutoff = shiftDateISO(todayISO, -PATTERN_MEMORY_RETENTION_DAYS);
  await db.run(sql`
    DELETE FROM user_theme_history
    WHERE user_id = ${userId} AND theme_date < ${cutoff}
  `);
}

export interface PatternMemoryRequest {
  userId: string;
  isPremium: boolean;
  todayISO: string;
  theme: HookTheme;
  lang: Lang;
}

/**
 * Premium-gated entry point used by the authenticated daily reading.
 *
 * Free users: returns null and writes nothing — the feature is invisible and storage-free.
 * Premium users: records today's theme, prunes old rows, then detects whether today's
 * theme echoes the recent past and returns a soft Pattern Memory block (or null).
 */
export async function buildPatternMemoryForUser(
  db: DB,
  request: PatternMemoryRequest,
): Promise<PatternMemoryBlock | null> {
  if (!request.isPremium) return null;

  const { userId, todayISO, theme, lang } = request;
  await recordDailyTheme(db, userId, todayISO, theme);
  await pruneThemeHistoryForUser(db, userId, todayISO);
  const history = await getRecentThemeHistory(db, userId, todayISO);
  return buildPatternMemoryBlock(theme, todayISO, history, lang);
}

export { daysBetweenISO };
