import type { GlobalSkyToday } from './globalSkyService';
import { getZodiacInfo } from '../utils/zodiac';
import { pushTeaserForTheme, selectHookTheme } from '../utils/dailyHook';

type QuietHours = {
  enabled: boolean;
  start: string;
  end: string;
};

export type RetentionNotificationKind =
  | 'daily_horoscope'
  | 'streak_reminder'
  | 're_engagement'
  | 'evening_reflection';

/** Local hour (user timezone) the Accuracy Loop evening check-in nudge is sent at. */
export const EVENING_REFLECTION_HOUR_LOCAL = 20;
export type StreakSegment = 'new' | 'building' | 'aligned' | 'devoted' | 'legendary';

export type RetentionNotificationCandidate = {
  kind: RetentionNotificationKind;
  userId: string;
  timezone: string | null;
  localHour: number;
  quietHours: QuietHours;
  preferenceEnabled: boolean;
  allEnabled: boolean;
  tokenEnabled: boolean;
  dedupeKey: string;
};

function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function isWithinQuietHours(localHour: number, quietHours: QuietHours): boolean {
  if (!quietHours.enabled) return false;
  const localMinutes = localHour * 60;
  const start = timeToMinutes(quietHours.start);
  const end = timeToMinutes(quietHours.end);
  if (start === end) return false;
  if (start < end) return localMinutes >= start && localMinutes < end;
  return localMinutes >= start || localMinutes < end;
}

export function shouldQueueRetentionNotification(candidate: RetentionNotificationCandidate): boolean {
  if (!candidate.allEnabled || !candidate.preferenceEnabled || !candidate.tokenEnabled) return false;
  if (isWithinQuietHours(candidate.localHour, candidate.quietHours)) return false;
  return Boolean(candidate.dedupeKey);
}

export function notificationDedupeKey(userId: string, kind: RetentionNotificationKind, localDate: string): string {
  return `${userId}:${kind}:${localDate}`;
}

export function bestSendHour(preferredReminderHour: number | null | undefined): number {
  if (
    typeof preferredReminderHour === 'number' &&
    Number.isInteger(preferredReminderHour) &&
    preferredReminderHour >= 0 &&
    preferredReminderHour <= 23
  ) {
    return preferredReminderHour;
  }
  return 9;
}

export function streakSegmentForNotification(streakCount: number): StreakSegment {
  if (streakCount >= 100) return 'legendary';
  if (streakCount >= 30) return 'devoted';
  if (streakCount >= 7) return 'aligned';
  if (streakCount >= 3) return 'building';
  return 'new';
}

export function streakReminderCopy(streakCount: number, segment = streakSegmentForNotification(streakCount)): string {
  void streakCount;
  if (segment === 'legendary' || segment === 'devoted') return 'Reveal today\'s horoscope.';
  if (segment === 'aligned' || segment === 'building') return 'Your sky is waiting.';
  return "Today's reading is ready.";
}

/**
 * Win-back ladder: re-engage lapsed users only on specific inactivity days so the
 * pipeline never turns into daily spam for someone who stopped opening the app.
 */
export const WINBACK_INACTIVE_DAYS = [3, 7, 14, 30] as const;

export function isWinBackDay(inactiveDays: number | null): boolean {
  return inactiveDays !== null && (WINBACK_INACTIVE_DAYS as readonly number[]).includes(inactiveDays);
}

export function localDateISOInTimezone(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function localHourInTimezone(date: Date, timezone: string): number {
  try {
    const hour = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }).format(date);
    const parsed = Number(hour.replace(/[^\d]/g, ''));
    return Number.isFinite(parsed) ? parsed % 24 : date.getUTCHours();
  } catch {
    return date.getUTCHours();
  }
}

export function previousDateISO(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function daysBetweenISO(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00.000Z`).getTime();
  const to = new Date(`${toISO}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export interface NotificationSelectionInput {
  localDate: string;
  streakCount: number;
  streakLastDate: string | null;
  dailyReminderEnabled: boolean;
  streakReminderEnabled: boolean;
  reEngagementEnabled: boolean;
}

/**
 * Decides which single retention notification (if any) a user should receive at
 * their reminder hour. One kind per run, precedence: win-back > streak rescue >
 * daily reminder. Returns null when the user already engaged today or nothing fits.
 */
export function selectNotificationKind(input: NotificationSelectionInput): RetentionNotificationKind | null {
  const completedToday = input.streakLastDate === input.localDate;
  if (completedToday) return null;

  const inactiveDays = input.streakLastDate ? daysBetweenISO(input.streakLastDate, input.localDate) : null;
  if (input.reEngagementEnabled && isWinBackDay(inactiveDays)) {
    return 're_engagement';
  }

  const streakAtRisk = input.streakCount > 0 && input.streakLastDate === previousDateISO(input.localDate);
  if (input.streakReminderEnabled && streakAtRisk) {
    return 'streak_reminder';
  }

  if (input.dailyReminderEnabled) {
    return 'daily_horoscope';
  }

  return null;
}

export interface NotificationCopy {
  title: string;
  body: string;
}

export function dailyReminderCopy(sky: GlobalSkyToday | null): NotificationCopy {
  if (sky) {
    // Derive the theme from the same Moon signal the in-app reading uses, so the
    // push teases the exact emotional hook the user sees after they open the app.
    const theme = selectHookTheme(getZodiacInfo(sky.moonSign).element, sky.moonPhase);
    return pushTeaserForTheme(theme);
  }
  return { title: 'Tonight\'s sky is ready', body: 'Your reading is waiting whenever you want to arrive.' };
}

export function streakRescueCopy(streakCount: number): NotificationCopy {
  return {
    title: streakCount > 1 ? `Keep your ${streakCount}-day rhythm` : 'Keep your rhythm going',
    body: streakReminderCopy(streakCount),
  };
}

export function winBackCopy(inactiveDays: number | null): NotificationCopy {
  if (inactiveDays !== null && inactiveDays >= 30) {
    return { title: 'The sky kept moving', body: 'A month of transits have shifted. See where today lands for you.' };
  }
  if (inactiveDays !== null && inactiveDays >= 14) {
    return { title: 'Your sky has changed', body: 'Two weeks of movement to catch up on. Tonight is a calm place to start.' };
  }
  if (inactiveDays !== null && inactiveDays >= 7) {
    return { title: 'A week of sky to revisit', body: 'The Moon has cycled forward. Your reading is here when you are.' };
  }
  return { title: 'Your reading missed you', body: 'A quiet moment is waiting. No streak pressure, just tonight\'s sky.' };
}

/**
 * Accuracy Loop evening nudge: invites the user to mark how today's reading landed.
 * Kept billing-neutral and calm, in the same register as the other push copy.
 */
export function eveningReflectionCopy(): NotificationCopy {
  return { title: 'How did today land?', body: "Take a breath and mark how today's sky felt." };
}

export function copyForKind(
  kind: RetentionNotificationKind,
  context: { sky: GlobalSkyToday | null; streakCount: number; inactiveDays: number | null },
): NotificationCopy {
  if (kind === 'streak_reminder') return streakRescueCopy(context.streakCount);
  if (kind === 're_engagement') return winBackCopy(context.inactiveDays);
  if (kind === 'evening_reflection') return eveningReflectionCopy();
  return dailyReminderCopy(context.sky);
}
