import { daysBetweenISO, localDateISOInTimezone } from './notificationSchedulingService';

/**
 * Signup-anchored trial lifecycle messaging.
 *
 * "Day N" is measured as whole local-calendar days since the user's account was
 * created (`users.created_at`), in the user's own timezone. Signup day is Day 0,
 * so the first calendar day after signup is Day 1.
 *
 * IMPORTANT — this is intentionally NOT bound to the real Stripe/RevenueCat trial:
 *   - There is no stored trial-start timestamp; capturing one would require
 *     touching the billing webhook, which is out of scope.
 *   - `users.isPremium` is TRUE during the 7-day trial (a `trialing` subscription
 *     is treated as premium), so it cannot distinguish a trial user from a paid
 *     one and must NOT be used to gate these messages.
 * Because of that, the copy is deliberately billing-neutral (no mention of a
 * charge, a subscription ending, payment, or real trial-start timing). It speaks
 * only about the daily ritual and the sky.
 *
 * FUTURE ENHANCEMENT (`trialStartedAt`): a later, billing-focused iteration can add a
 * persisted trial-start timestamp (populated from the trial_started signal) and
 * re-anchor these stages to the real trial window, unlocking trial-specific
 * urgency copy. Until then we validate the lifecycle cadence + messaging against
 * the signup date.
 */

/** Local-calendar days since signup that receive a lifecycle nudge. */
export const TRIAL_LIFECYCLE_DAYS = [1, 3, 5, 6, 7] as const;

/** Single win-back ("lapsed recovery") touch, a few days after the Day-7 milestone. */
export const TRIAL_LAPSED_DAY = 10;

export type TrialLifecycleStage =
  | 'trial_day_1'
  | 'trial_day_3'
  | 'trial_day_5'
  | 'trial_day_6'
  | 'trial_day_7'
  | 'trial_lapsed';

export interface TrialLifecycleCopy {
  title: string;
  body: string;
}

/**
 * Parse a DB timestamp into a Date. D1's `CURRENT_TIMESTAMP` is UTC in
 * `YYYY-MM-DD HH:MM:SS` form (no `T`, no zone); normalise it to an ISO instant so
 * it is parsed as UTC rather than the runtime's local zone. Already-ISO strings
 * (with `T` and/or a zone) are passed through unchanged.
 */
export function parseDbTimestampToDate(value: string): Date {
  let normalized = value.trim();
  if (!normalized.includes('T')) normalized = normalized.replace(' ', 'T');
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized);
  if (!hasZone) normalized = `${normalized}Z`;
  return new Date(normalized);
}

/**
 * Whole local-calendar days between the user's signup and `todayLocalDate`, in the
 * user's timezone. Returns a non-negative integer (signup day = 0). Falls back to
 * the UTC date if the stored timestamp cannot be parsed.
 */
export function trialDayForUser(createdAtISO: string, todayLocalDate: string, timezone: string): number {
  const createdAt = parseDbTimestampToDate(createdAtISO);
  if (Number.isNaN(createdAt.getTime())) return 0;
  const signupLocalDate = localDateISOInTimezone(createdAt, timezone);
  return daysBetweenISO(signupLocalDate, todayLocalDate);
}

/**
 * The single lifecycle stage (if any) due for a user on a given trial day. One
 * stage per day; returns null on every off-schedule day. Deliberately takes no
 * subscription state — the lifecycle is not gated on `isPremium` (see module doc).
 */
export function selectTrialLifecycleStage(input: { trialDay: number }): TrialLifecycleStage | null {
  const { trialDay } = input;
  if ((TRIAL_LIFECYCLE_DAYS as readonly number[]).includes(trialDay)) {
    return `trial_day_${trialDay}` as TrialLifecycleStage;
  }
  if (trialDay === TRIAL_LAPSED_DAY) return 'trial_lapsed';
  return null;
}

/**
 * Stage-scoped dedupe key (no date) so each stage can fire at most once ever for a
 * user, even across timezone drift or a re-run of the hourly pipeline. The unique
 * index on `notification_jobs.dedupe_key` enforces the once-only guarantee.
 */
export function trialLifecycleDedupeKey(userId: string, stage: TrialLifecycleStage): string {
  return `trial:${userId}:${stage}`;
}

/**
 * Billing-neutral, signup-anchored copy for each stage. Speaks only about the
 * daily ritual and the sky — never a charge, a subscription, payment, or real
 * trial timing.
 */
export function trialLifecycleCopy(stage: TrialLifecycleStage): TrialLifecycleCopy {
  switch (stage) {
    case 'trial_day_1':
      return {
        title: 'Your first sky is ready',
        body: 'Welcome. Your reading is waiting whenever you want to arrive.',
      };
    case 'trial_day_3':
      return {
        title: 'A deeper reading awaits',
        body: 'Three days in. There is more beneath today\'s sky than you have seen yet.',
      };
    case 'trial_day_5':
      return {
        title: 'The sky has been moving',
        body: 'Five days of transits have shifted. Slip back in and see where today lands.',
      };
    case 'trial_day_6':
      return {
        title: 'Keep your rhythm',
        body: 'You have found a quiet daily ritual. Tonight\'s sky is here for it.',
      };
    case 'trial_day_7':
      return {
        title: 'One week beneath the sky',
        body: 'Seven days with us. The Moon has come a long way — so have you.',
      };
    case 'trial_lapsed':
      return {
        title: 'The sky kept moving',
        body: 'It has been a while. A calm moment is waiting whenever you return.',
      };
  }
}
