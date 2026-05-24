type QuietHours = {
  enabled: boolean;
  start: string;
  end: string;
};

export type RetentionNotificationKind = 'daily_horoscope' | 'streak_reminder' | 're_engagement';
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
  if (segment === 'legendary') return `${streakCount} nights mapped beneath the same sky \uD83C\uDF19`;
  if (segment === 'devoted') return 'Your ritual history is glowing under the open sky.';
  if (segment === 'aligned') return `${streakCount} nights aligned under the same stars \uD83C\uDF19`;
  if (segment === 'building') return 'Your cosmic rhythm is building \u2728';
  return "Today's sky is ready when you are \u2728";
}
