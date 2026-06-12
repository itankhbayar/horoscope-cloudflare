import { sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { isoWeekKey } from './periodHoroscopeService';
import { log, metric } from '../utils/logger';

const DEFAULT_CHUNK_SIZE = 100;
const EXPIRED_REFRESH_RETENTION_DAYS = 7;
const REVOKED_REFRESH_RETENTION_DAYS = 30;
const PROCESSED_WEBHOOK_RETENTION_DAYS = 30;
const TAROT_DAILY_RETENTION_DAYS = 45;
const NOTIFICATION_JOB_RETENTION_DAYS = 14;

type CleanupJobResult = {
  job: string;
  deleted: number;
  chunks: number;
};

export type CleanupResult = {
  jobs: CleanupJobResult[];
  deleted: number;
};

async function runChunkedDelete(
  db: DB,
  job: string,
  statement: (limit: number) => ReturnType<typeof sql>,
  chunkSize = DEFAULT_CHUNK_SIZE,
): Promise<CleanupJobResult> {
  let deleted = 0;
  let chunks = 0;

  for (;;) {
    const result = await db.run(statement(chunkSize));
    const changes = Number((result as { meta?: { changes?: number } }).meta?.changes ?? 0);
    if (changes <= 0) break;
    deleted += changes;
    chunks += 1;
    if (changes < chunkSize) break;
  }

  return { job, deleted, chunks };
}

function cutoff(days: number): string {
  return `-${days} days`;
}

/** Period keys that should be RETAINED for a given reference date — everything older is purged. */
function currentPeriodKeys(dateISO: string): { week: string; month: string; year: string } {
  return {
    week: isoWeekKey(dateISO),
    month: dateISO.slice(0, 7),
    year: dateISO.slice(0, 4),
  };
}

export async function cleanupOperationalData(
  db: DB,
  env: Record<string, unknown> = {},
  chunkSize = DEFAULT_CHUNK_SIZE,
  // The reading prewarm and this cleanup must agree on "today" so the cron never deletes the
  // rows it just wrote at a timezone/midnight edge. Defaults to the current UTC date.
  referenceDateISO: string = new Date().toISOString().slice(0, 10),
): Promise<CleanupResult> {
  const periodKeys = currentPeriodKeys(referenceDateISO);
  const started = Date.now();
  const jobs: CleanupJobResult[] = [];

  const run = async (job: string, statement: (limit: number) => ReturnType<typeof sql>) => {
    const jobStarted = Date.now();
    const result = await runChunkedDelete(db, job, statement, chunkSize);
    jobs.push(result);
    log(env, 'info', 'cron_cleanup_job_completed', {
      job,
      deleted: result.deleted,
      chunks: result.chunks,
      durationMs: Date.now() - jobStarted,
    });
    metric(env, 'cron_cleanup_job_completed', { job, deleted: result.deleted });
  };

  await run('refresh_sessions_expired', (limit) => sql`
    DELETE FROM refresh_sessions
    WHERE id IN (
      SELECT id FROM refresh_sessions
      WHERE expires_at < datetime('now', ${cutoff(EXPIRED_REFRESH_RETENTION_DAYS)})
      LIMIT ${limit}
    )
  `);

  await run('refresh_sessions_revoked', (limit) => sql`
    DELETE FROM refresh_sessions
    WHERE id IN (
      SELECT id FROM refresh_sessions
      WHERE revoked_at IS NOT NULL
        AND revoked_at < datetime('now', ${cutoff(REVOKED_REFRESH_RETENTION_DAYS)})
      LIMIT ${limit}
    )
  `);

  await run('stripe_webhook_events_processed', (limit) => sql`
    DELETE FROM stripe_webhook_events
    WHERE event_id IN (
      SELECT event_id FROM stripe_webhook_events
      WHERE status = 'processed'
        AND processed_at IS NOT NULL
        AND processed_at < datetime('now', ${cutoff(PROCESSED_WEBHOOK_RETENTION_DAYS)})
      LIMIT ${limit}
    )
  `);

  // Daily readings live in D1 for a single day: keep only the current date, purge every prior day.
  await run('daily_horoscopes_old_cache', (limit) => sql`
    DELETE FROM daily_horoscopes
    WHERE id IN (
      SELECT id FROM daily_horoscopes
      WHERE date < ${referenceDateISO}
      LIMIT ${limit}
    )
  `);

  // Period readings live for exactly their period: keep only the current week/month/year key,
  // purge older keys. Keys are fixed-width and zero-padded, so a lexical < compares correctly
  // within each period_type (including across year boundaries).
  await run('period_horoscopes_old_cache', (limit) => sql`
    DELETE FROM period_horoscopes
    WHERE id IN (
      SELECT id FROM period_horoscopes
      WHERE (period_type = 'weekly'  AND period_key < ${periodKeys.week})
         OR (period_type = 'monthly' AND period_key < ${periodKeys.month})
         OR (period_type = 'yearly'  AND period_key < ${periodKeys.year})
      LIMIT ${limit}
    )
  `);

  await run('tarot_daily_old_cache', (limit) => sql`
    DELETE FROM tarot_daily
    WHERE id IN (
      SELECT id FROM tarot_daily
      WHERE date < date('now', ${cutoff(TAROT_DAILY_RETENTION_DAYS)})
      LIMIT ${limit}
    )
  `);

  await run('notification_jobs_terminal', (limit) => sql`
    DELETE FROM notification_jobs
    WHERE id IN (
      SELECT id FROM notification_jobs
      WHERE status IN ('sent', 'failed', 'skipped')
        AND updated_at < datetime('now', ${cutoff(NOTIFICATION_JOB_RETENTION_DAYS)})
      LIMIT ${limit}
    )
  `);

  const deleted = jobs.reduce((sum, job) => sum + job.deleted, 0);
  log(env, 'info', 'cron_cleanup_completed', {
    deleted,
    durationMs: Date.now() - started,
  });
  metric(env, 'cron_cleanup_completed', { deleted });

  return { jobs, deleted };
}
