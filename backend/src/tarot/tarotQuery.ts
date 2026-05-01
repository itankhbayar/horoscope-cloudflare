import { isZodiacSign, type ZodiacSign } from '../utils/zodiac';
import { toDateIsoForTimezone } from '../services/horoscopePrewarmService';

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isValidIanaTimeZone(tz: string): boolean {
  if (!tz || tz.length > 120) return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function isValidCalendarDate(iso: string): boolean {
  if (!DATE_RE.test(iso)) return false;
  const t = Date.parse(`${iso}T12:00:00Z`);
  return !Number.isNaN(t);
}

export type ParsedTarotQuery =
  | { ok: true; sign: ZodiacSign; timezone: string; date: string }
  | { ok: false; error: string; status: number };

export function parseTarotQueryParams(
  rawSign: string | undefined,
  rawTimezone: string | undefined,
  rawDate: string | undefined,
): ParsedTarotQuery {
  const sign = (rawSign ?? '').trim().toLowerCase();
  if (!sign || !isZodiacSign(sign)) {
    return { ok: false, error: 'Invalid or missing sign (12 zodiac keys, lowercase)', status: 400 };
  }
  const timezone = (rawTimezone ?? '').trim();
  if (!timezone) {
    return { ok: false, error: 'Missing timezone (IANA, e.g. Asia/Ulaanbaatar)', status: 400 };
  }
  if (!isValidIanaTimeZone(timezone)) {
    return { ok: false, error: 'Invalid timezone', status: 400 };
  }

  const date = (rawDate ?? '').trim();
  if (!date) {
    return {
      ok: true,
      sign,
      timezone,
      date: toDateIsoForTimezone(Date.now(), timezone),
    };
  }
  if (!isValidCalendarDate(date)) {
    return { ok: false, error: 'Invalid date (use YYYY-MM-DD)', status: 400 };
  }
  return { ok: true, sign, timezone, date };
}

export function calendarTodayInTimezone(timezone: string, nowMs = Date.now()): string {
  return toDateIsoForTimezone(nowMs, timezone);
}
