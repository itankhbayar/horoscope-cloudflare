/** Fallback when `Intl.supportedValuesOf('timeZone')` is unavailable. */
export const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Ulaanbaatar',
  'Australia/Sydney',
] as const;

/**
 * IANA timezone ids for profile `<select>` options.
 * Uses `Intl.supportedValuesOf('timeZone')` when available.
 */
export function getTimezoneOptions(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  if (typeof intl.supportedValuesOf === 'function') {
    return intl.supportedValuesOf('timeZone');
  }
  return [...FALLBACK_TIMEZONES];
}
