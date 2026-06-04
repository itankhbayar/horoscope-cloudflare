import { sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import type { AppBindings } from '../types';
import { log, metric } from '../utils/logger';
import { buildGlobalSkyToday, type GlobalSkyToday } from './globalSkyService';
import {
  bestSendHour,
  copyForKind,
  daysBetweenISO,
  isWithinQuietHours,
  localDateISOInTimezone,
  localHourInTimezone,
  notificationDedupeKey,
  selectNotificationKind,
  shouldQueueRetentionNotification,
  type RetentionNotificationKind,
} from './notificationSchedulingService';
import {
  selectTrialLifecycleStage,
  trialDayForUser,
  trialLifecycleCopy,
  trialLifecycleDedupeKey,
} from './trialLifecycleService';
import {
  buildExpoMessages,
  chunk,
  classifyReceipt,
  classifyTicket,
  getExpoPushReceipts,
  sendExpoPushBatch,
  type ExpoPushTicket,
} from './expoPushClient';

const DEFAULT_TIMEZONE = 'UTC';
const DELIVER_BATCH_LIMIT = 200;
const RECEIPT_POLL_LIMIT = 200;
const RECEIPT_POLL_DELAY_MS = 10 * 60 * 1000;
const EXPO_RECEIPT_QUERY_SIZE = 1000;

interface CandidateRow {
  id: string;
  created_at: string;
  timezone: string | null;
  streak_count: number;
  streak_last_date: string | null;
  daily_reminder_enabled: number;
  streak_reminder_enabled: number;
  re_engagement_enabled: number;
  quiet_hours_enabled: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  reminder_hour_local: number;
}

interface JobRow {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  data: string | null;
  attempt_count: number;
  max_attempts: number;
}

export interface EnqueueSummary {
  considered: number;
  enqueued: number;
  skipped: number;
  /** Subset of `enqueued` that were signup-anchored trial lifecycle nudges. */
  lifecycleEnqueued: number;
}

export interface DeliverSummary {
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
  retried: number;
  tokensDisabled: number;
}

export interface ReceiptSummary {
  jobsChecked: number;
  tokensDisabled: number;
}

export interface PipelineSummary {
  enqueue: EnqueueSummary;
  deliver: DeliverSummary;
  receipts: ReceiptSummary;
}

/** Receipt id paired with the device token it was sent to, persisted on the job row. */
interface PersistedReceipt {
  ticketId: string;
  token: string;
}

export interface SendSummary {
  okReceipts: PersistedReceipt[];
  invalidTokens: string[];
  retriable: boolean;
  errorSummary: string | null;
}

export type JobOutcome = 'sent' | 'pending' | 'failed';

function changesFrom(result: unknown): number {
  return Number((result as { meta?: { changes?: number } }).meta?.changes ?? 0);
}

/**
 * Reduce positional send tickets into an actionable summary: which receipts to
 * track, which tokens are dead, and whether the job is worth retrying.
 */
export function summarizeSend(tokens: string[], tickets: ExpoPushTicket[]): SendSummary {
  const okReceipts: PersistedReceipt[] = [];
  const invalidTokens: string[] = [];
  const errors: string[] = [];
  let retriable = false;

  tokens.forEach((token, index) => {
    const ticket = tickets[index];
    const outcome = classifyTicket(ticket);
    if (outcome === 'ok') {
      if (ticket?.id) okReceipts.push({ ticketId: ticket.id, token });
      return;
    }
    if (outcome === 'invalid_token') {
      invalidTokens.push(token);
      return;
    }
    if (outcome === 'retriable') retriable = true;
    if (ticket?.details?.error) errors.push(ticket.details.error);
    else if (ticket?.message) errors.push(ticket.message);
  });

  return {
    okReceipts,
    invalidTokens,
    retriable,
    errorSummary: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
  };
}

export function decideJobOutcome(summary: SendSummary, attemptCount: number, maxAttempts: number): JobOutcome {
  if (summary.okReceipts.length > 0) return 'sent';
  if (summary.retriable && attemptCount < maxAttempts) return 'pending';
  return 'failed';
}

async function disableToken(db: DB, token: string, nowISO: string): Promise<void> {
  await db.run(sql`
    UPDATE push_tokens
    SET enabled = 0, updated_at = ${nowISO}
    WHERE expo_push_token = ${token}
  `);
}

async function setJobStatus(
  db: DB,
  jobId: string,
  status: JobOutcome | 'skipped',
  nowISO: string,
  lastError: string | null,
): Promise<void> {
  await db.run(sql`
    UPDATE notification_jobs
    SET status = ${status}, last_error = ${lastError}, updated_at = ${nowISO}
    WHERE id = ${jobId}
  `);
}

/**
 * Timezone-aware fan-out. For every opted-in, token-backed user whose local hour
 * matches their reminder hour, enqueue exactly one notification (win-back > streak
 * rescue > daily) idempotently via the dedupe-key unique index.
 */
export async function enqueueDueNotifications(
  db: DB,
  env: Partial<AppBindings>,
  options: { nowMs?: number } = {},
): Promise<EnqueueSummary> {
  const nowMs = options.nowMs ?? Date.now();
  const now = new Date(nowMs);
  const nowISO = now.toISOString();
  const defaultTimezone = env.CRON_TIMEZONE ?? DEFAULT_TIMEZONE;

  const rows = await db.all<CandidateRow>(sql`
    SELECT u.id, u.created_at, u.timezone, u.streak_count, u.streak_last_date,
           p.daily_reminder_enabled, p.streak_reminder_enabled, p.re_engagement_enabled,
           p.quiet_hours_enabled, p.quiet_hours_start, p.quiet_hours_end, p.reminder_hour_local
    FROM users u
    JOIN notification_preferences p ON p.user_id = u.id
    WHERE p.all_enabled = 1
      AND EXISTS (
        SELECT 1 FROM push_tokens t WHERE t.user_id = u.id AND t.enabled = 1
      )
  `);

  const skyCache = new Map<string, GlobalSkyToday>();
  let considered = 0;
  let enqueued = 0;
  let skipped = 0;
  let lifecycleEnqueued = 0;

  for (const row of rows) {
    const timezone = row.timezone ?? defaultTimezone;
    const localHour = localHourInTimezone(now, timezone);
    if (localHour !== bestSendHour(row.reminder_hour_local)) continue;

    considered += 1;
    const localDate = localDateISOInTimezone(now, timezone);

    // Highest precedence: a signup-anchored trial lifecycle nudge. When one is due
    // it replaces the daily/streak/win-back selection so the user gets exactly one
    // push this run. Not gated on isPremium (trial users are isPremium=true) — only
    // on the master switch (SQL all_enabled), an enabled token (SQL EXISTS), quiet
    // hours, and the stage-scoped dedupe key. Copy is billing-neutral.
    const trialStage = selectTrialLifecycleStage({
      trialDay: trialDayForUser(row.created_at, localDate, timezone),
    });
    if (trialStage) {
      const inQuietHours = isWithinQuietHours(localHour, {
        enabled: Boolean(row.quiet_hours_enabled),
        start: row.quiet_hours_start,
        end: row.quiet_hours_end,
      });
      if (inQuietHours) {
        skipped += 1;
        continue;
      }
      const dedupeKey = trialLifecycleDedupeKey(row.id, trialStage);
      const copy = trialLifecycleCopy(trialStage);
      const data = JSON.stringify({ kind: trialStage, route: 'home', localDate });
      const result = await db.run(sql`
        INSERT OR IGNORE INTO notification_jobs
          (id, dedupe_key, kind, user_id, local_date, title, body, data, status, scheduled_for)
        VALUES
          (${crypto.randomUUID()}, ${dedupeKey}, ${trialStage}, ${row.id}, ${localDate},
           ${copy.title}, ${copy.body}, ${data}, 'pending', ${nowISO})
      `);
      if (changesFrom(result) > 0) {
        enqueued += 1;
        lifecycleEnqueued += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    const kind = selectNotificationKind({
      localDate,
      streakCount: row.streak_count,
      streakLastDate: row.streak_last_date,
      dailyReminderEnabled: Boolean(row.daily_reminder_enabled),
      streakReminderEnabled: Boolean(row.streak_reminder_enabled),
      reEngagementEnabled: Boolean(row.re_engagement_enabled),
    });
    if (!kind) {
      skipped += 1;
      continue;
    }

    const dedupeKey = notificationDedupeKey(row.id, kind, localDate);
    const preferenceEnabled = preferenceEnabledForKind(row, kind);
    const eligible = shouldQueueRetentionNotification({
      kind,
      userId: row.id,
      timezone,
      localHour,
      quietHours: {
        enabled: Boolean(row.quiet_hours_enabled),
        start: row.quiet_hours_start,
        end: row.quiet_hours_end,
      },
      preferenceEnabled,
      allEnabled: true,
      tokenEnabled: true,
      dedupeKey,
    });
    if (!eligible) {
      skipped += 1;
      continue;
    }

    let sky: GlobalSkyToday | null = null;
    if (kind === 'daily_horoscope') {
      sky = skyCache.get(localDate) ?? buildGlobalSkyToday(localDate);
      skyCache.set(localDate, sky);
    }
    const inactiveDays = row.streak_last_date ? daysBetweenISO(row.streak_last_date, localDate) : null;
    const copy = copyForKind(kind, { sky, streakCount: row.streak_count, inactiveDays });
    const data = JSON.stringify({ kind, route: 'home', localDate });

    const result = await db.run(sql`
      INSERT OR IGNORE INTO notification_jobs
        (id, dedupe_key, kind, user_id, local_date, title, body, data, status, scheduled_for)
      VALUES
        (${crypto.randomUUID()}, ${dedupeKey}, ${kind}, ${row.id}, ${localDate},
         ${copy.title}, ${copy.body}, ${data}, 'pending', ${nowISO})
    `);
    if (changesFrom(result) > 0) enqueued += 1;
    else skipped += 1;
  }

  log(env, 'info', 'notification_enqueue_completed', {
    considered,
    enqueued,
    skipped,
    lifecycleEnqueued,
    candidates: rows.length,
  });
  metric(env, 'notification_enqueue', { considered, enqueued, skipped });
  metric(env, 'trial_lifecycle_enqueue', { enqueued: lifecycleEnqueued });
  return { considered, enqueued, skipped, lifecycleEnqueued };
}

function preferenceEnabledForKind(row: CandidateRow, kind: RetentionNotificationKind): boolean {
  if (kind === 'streak_reminder') return Boolean(row.streak_reminder_enabled);
  if (kind === 're_engagement') return Boolean(row.re_engagement_enabled);
  return Boolean(row.daily_reminder_enabled);
}

/**
 * Claim due pending jobs, deliver them to every enabled device for the user, and
 * resolve outcomes: success, retry (bounded by max_attempts), or terminal failure.
 * Dead tokens reported in the send tickets are disabled immediately.
 */
export async function deliverPendingNotifications(
  db: DB,
  env: Partial<AppBindings>,
  options: { nowMs?: number; limit?: number } = {},
): Promise<DeliverSummary> {
  const nowMs = options.nowMs ?? Date.now();
  const nowISO = new Date(nowMs).toISOString();
  const limit = options.limit ?? DELIVER_BATCH_LIMIT;
  const accessToken = env.EXPO_ACCESS_TOKEN;

  // Atomically claim a batch: flip to 'sending' and count this delivery attempt.
  await db.run(sql`
    UPDATE notification_jobs
    SET status = 'sending', attempt_count = attempt_count + 1, updated_at = ${nowISO}
    WHERE id IN (
      SELECT id FROM notification_jobs
      WHERE status = 'pending' AND scheduled_for <= ${nowISO} AND attempt_count < max_attempts
      ORDER BY scheduled_for ASC
      LIMIT ${limit}
    )
  `);

  const jobs = await db.all<JobRow>(sql`
    SELECT id, user_id, kind, title, body, data, attempt_count, max_attempts
    FROM notification_jobs
    WHERE status = 'sending'
    ORDER BY scheduled_for ASC
    LIMIT ${limit}
  `);

  const summary: DeliverSummary = { claimed: jobs.length, sent: 0, failed: 0, skipped: 0, retried: 0, tokensDisabled: 0 };

  for (const job of jobs) {
    const tokenRows = await db.all<{ expo_push_token: string }>(sql`
      SELECT expo_push_token FROM push_tokens WHERE user_id = ${job.user_id} AND enabled = 1
    `);
    const tokens = tokenRows.map((t) => t.expo_push_token);
    if (tokens.length === 0) {
      await setJobStatus(db, job.id, 'skipped', nowISO, 'no_enabled_tokens');
      summary.skipped += 1;
      continue;
    }

    const data = job.data ? safeParse(job.data) : undefined;
    const messages = buildExpoMessages(tokens, { title: job.title, body: job.body, data });

    let tickets: ExpoPushTicket[];
    try {
      tickets = [];
      for (const batch of chunk(messages)) {
        const batchTickets = await sendExpoPushBatch(batch, { accessToken });
        tickets.push(...batchTickets);
      }
    } catch (err) {
      // Transport/HTTP failure: retry if attempts remain, otherwise give up.
      const outcome: JobOutcome = job.attempt_count < job.max_attempts ? 'pending' : 'failed';
      await setJobStatus(db, job.id, outcome, nowISO, String(err));
      if (outcome === 'pending') summary.retried += 1;
      else summary.failed += 1;
      continue;
    }

    const sendSummary = summarizeSend(tokens, tickets);
    for (const token of sendSummary.invalidTokens) {
      await disableToken(db, token, nowISO);
      summary.tokensDisabled += 1;
    }

    const outcome = decideJobOutcome(sendSummary, job.attempt_count, job.max_attempts);
    if (outcome === 'sent') {
      await db.run(sql`
        UPDATE notification_jobs
        SET status = 'sent', sent_at = ${nowISO}, updated_at = ${nowISO},
            receipts = ${JSON.stringify(sendSummary.okReceipts)}, last_error = ${sendSummary.errorSummary}
        WHERE id = ${job.id}
      `);
      summary.sent += 1;
    } else if (outcome === 'pending') {
      await setJobStatus(db, job.id, 'pending', nowISO, sendSummary.errorSummary);
      summary.retried += 1;
    } else {
      await setJobStatus(db, job.id, 'failed', nowISO, sendSummary.errorSummary);
      summary.failed += 1;
    }
  }

  log(env, 'info', 'notification_deliver_completed', { ...summary });
  metric(env, 'notification_deliver', { ...summary });
  return summary;
}

/**
 * Delayed receipt check. Expo reports some dead tokens (e.g. DeviceNotRegistered)
 * only in receipts, not in the initial ticket, so this disables those tokens after
 * a short delay and marks each job as receipt-checked.
 */
export async function pollNotificationReceipts(
  db: DB,
  env: Partial<AppBindings>,
  options: { nowMs?: number; limit?: number } = {},
): Promise<ReceiptSummary> {
  const nowMs = options.nowMs ?? Date.now();
  const nowISO = new Date(nowMs).toISOString();
  const cutoffISO = new Date(nowMs - RECEIPT_POLL_DELAY_MS).toISOString();
  const limit = options.limit ?? RECEIPT_POLL_LIMIT;
  const accessToken = env.EXPO_ACCESS_TOKEN;

  const jobs = await db.all<{ id: string; receipts: string | null }>(sql`
    SELECT id, receipts FROM notification_jobs
    WHERE status = 'sent' AND receipts IS NOT NULL AND receipts_checked_at IS NULL AND sent_at <= ${cutoffISO}
    ORDER BY sent_at ASC
    LIMIT ${limit}
  `);
  if (jobs.length === 0) return { jobsChecked: 0, tokensDisabled: 0 };

  const idToToken = new Map<string, string>();
  for (const job of jobs) {
    const parsed = (job.receipts ? safeParse(job.receipts) : []) as PersistedReceipt[] | undefined;
    if (!Array.isArray(parsed)) continue;
    for (const receipt of parsed) {
      if (receipt?.ticketId && receipt?.token) idToToken.set(receipt.ticketId, receipt.token);
    }
  }

  let tokensDisabled = 0;
  const ticketIds = [...idToToken.keys()];
  for (const idBatch of chunk(ticketIds, EXPO_RECEIPT_QUERY_SIZE)) {
    let receipts: Record<string, { status: 'ok' | 'error'; details?: { error?: string } }>;
    try {
      receipts = await getExpoPushReceipts(idBatch, { accessToken });
    } catch (err) {
      // Leave jobs unmarked so the next run retries the receipt fetch.
      log(env, 'warn', 'notification_receipts_fetch_failed', { error: String(err), ids: idBatch.length });
      continue;
    }
    const disabledThisBatch = new Set<string>();
    for (const [ticketId, receipt] of Object.entries(receipts)) {
      if (classifyReceipt(receipt) !== 'invalid_token') continue;
      const token = idToToken.get(ticketId);
      if (token && !disabledThisBatch.has(token)) {
        await disableToken(db, token, nowISO);
        disabledThisBatch.add(token);
        tokensDisabled += 1;
      }
    }
  }

  await db.run(sql`
    UPDATE notification_jobs
    SET receipts_checked_at = ${nowISO}, updated_at = ${nowISO}
    WHERE id IN (${sql.join(jobs.map((j) => sql`${j.id}`), sql`, `)})
  `);

  log(env, 'info', 'notification_receipts_completed', { jobsChecked: jobs.length, tokensDisabled });
  metric(env, 'notification_receipts', { jobsChecked: jobs.length, tokensDisabled });
  return { jobsChecked: jobs.length, tokensDisabled };
}

/** Full hourly retention pass: enqueue due notifications, deliver, then poll receipts. */
export async function runRetentionPipeline(
  db: DB,
  env: Partial<AppBindings>,
  options: { nowMs?: number } = {},
): Promise<PipelineSummary> {
  const nowMs = options.nowMs ?? Date.now();
  const enqueue = await enqueueDueNotifications(db, env, { nowMs });
  const deliver = await deliverPendingNotifications(db, env, { nowMs });
  const receipts = await pollNotificationReceipts(db, env, { nowMs });
  return { enqueue, deliver, receipts };
}

function safeParse(value: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
