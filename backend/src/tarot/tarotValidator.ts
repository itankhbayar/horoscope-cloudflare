import type { TarotLocaleText, TarotPersistedPayload } from './tarotTypes';

const MAX_TIMEZONE_LEN = 120;
const MAX_SIGN_LEN = 24;
const MAX_DATE_LEN = 16;
const MAX_LOCALE_BLOCK = 4500;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function keysExact(obj: Record<string, unknown>, allowed: Set<string>): boolean {
  const keys = Object.keys(obj);
  if (keys.length !== allowed.size) return false;
  for (const k of keys) {
    if (!allowed.has(k)) return false;
  }
  return true;
}

function isNonEmptyString(v: unknown, maxLen: number): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxLen;
}

function validateLocaleText(raw: unknown, field: string): { ok: true; value: TarotLocaleText } | { ok: false; error: string } {
  if (!isPlainObject(raw)) return { ok: false, error: `${field} must be an object` };
  if (!keysExact(raw, new Set(['en', 'mn']))) {
    return { ok: false, error: `${field} must contain only en and mn` };
  }
  if (!isNonEmptyString(raw.en, MAX_LOCALE_BLOCK)) {
    return { ok: false, error: `${field}.en must be a non-empty string within length limits` };
  }
  if (!isNonEmptyString(raw.mn, MAX_LOCALE_BLOCK)) {
    return { ok: false, error: `${field}.mn must be a non-empty string within length limits` };
  }
  return { ok: true, value: { en: raw.en.trim(), mn: raw.mn.trim() } };
}

/**
 * Strict gatekeeper before DB write. Rejects unknown keys, bad types, empty strings, unsafe lengths.
 */
export function validateTarotPayload(raw: unknown): { ok: true; value: TarotPersistedPayload } | { ok: false; error: string } {
  if (!isPlainObject(raw)) return { ok: false, error: 'Payload must be a JSON object' };
  const topKeys = new Set(Object.keys(raw));
  const allowedTop = new Set(['date', 'timezone', 'sign', 'card_of_the_day', 'reading', 'copyRev']);
  for (const k of topKeys) {
    if (!allowedTop.has(k)) return { ok: false, error: 'Payload has unknown top-level keys' };
  }
  for (const req of ['date', 'timezone', 'sign', 'card_of_the_day', 'reading'] as const) {
    if (!topKeys.has(req)) return { ok: false, error: `Payload must include ${req}` };
  }
  let copyRev: number | undefined;
  if (raw.copyRev !== undefined) {
    if (typeof raw.copyRev !== 'number' || !Number.isInteger(raw.copyRev) || raw.copyRev < 1 || raw.copyRev > 99) {
      return { ok: false, error: 'copyRev must be an integer from 1 to 99 when present' };
    }
    copyRev = raw.copyRev;
  }

  if (!isNonEmptyString(raw.date, MAX_DATE_LEN)) return { ok: false, error: 'Invalid date field' };
  if (!isNonEmptyString(raw.timezone, MAX_TIMEZONE_LEN)) return { ok: false, error: 'Invalid timezone field' };
  if (!isNonEmptyString(raw.sign, MAX_SIGN_LEN)) return { ok: false, error: 'Invalid sign field' };

  const cod = raw.card_of_the_day;
  if (!isPlainObject(cod)) return { ok: false, error: 'card_of_the_day must be an object' };
  if (!keysExact(cod, new Set(['name', 'arcana', 'orientation', 'core_meaning']))) {
    return { ok: false, error: 'card_of_the_day has invalid or extra properties' };
  }
  const nameVal = validateLocaleText(cod.name, 'card_of_the_day.name');
  if (!nameVal.ok) return nameVal;
  if (cod.arcana !== 'Major' && cod.arcana !== 'Minor') {
    return { ok: false, error: 'card_of_the_day.arcana must be Major or Minor' };
  }
  if (cod.orientation !== 'Upright' && cod.orientation !== 'Reversed') {
    return { ok: false, error: 'card_of_the_day.orientation must be Upright or Reversed' };
  }
  const core = validateLocaleText(cod.core_meaning, 'card_of_the_day.core_meaning');
  if (!core.ok) return core;

  const reading = raw.reading;
  if (!isPlainObject(reading)) return { ok: false, error: 'reading must be an object' };
  if (!keysExact(reading, new Set(['overview', 'love', 'career', 'energy']))) {
    return { ok: false, error: 'reading has invalid or extra properties' };
  }

  const ov = validateLocaleText(reading.overview, 'reading.overview');
  if (!ov.ok) return ov;
  const lv = validateLocaleText(reading.love, 'reading.love');
  if (!lv.ok) return lv;
  const cv = validateLocaleText(reading.career, 'reading.career');
  if (!cv.ok) return cv;
  const ev = validateLocaleText(reading.energy, 'reading.energy');
  if (!ev.ok) return ev;

  const value: TarotPersistedPayload = {
    ...(copyRev !== undefined ? { copyRev } : {}),
    date: raw.date.trim(),
    timezone: raw.timezone.trim(),
    sign: raw.sign.trim().toLowerCase(),
    card_of_the_day: {
      name: nameVal.value,
      arcana: cod.arcana,
      orientation: cod.orientation,
      core_meaning: core.value,
    },
    reading: {
      overview: ov.value,
      love: lv.value,
      career: cv.value,
      energy: ev.value,
    },
  };

  return { ok: true, value };
}
