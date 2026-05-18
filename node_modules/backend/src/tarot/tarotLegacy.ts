import type { TarotPersistedPayload } from './tarotTypes';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function capArcana(v: string): 'Major' | 'Minor' | null {
  const x = v.toLowerCase();
  if (x === 'major') return 'Major';
  if (x === 'minor') return 'Minor';
  return null;
}

function capOrientation(v: string): 'Upright' | 'Reversed' | null {
  const x = v.toLowerCase();
  if (x === 'upright') return 'Upright';
  if (x === 'reversed') return 'Reversed';
  return null;
}

/**
 * Older rows stored `{ card, sections, meta }` without bilingual blocks or top-level date/tz/sign.
 * Maps to current `TarotPersistedPayload` (duplicate EN into MN for legacy reads until prewarm replaces).
 */
export function legacyPayloadToPersisted(
  raw: unknown,
  sign: string,
  date: string,
  timezone: string,
): TarotPersistedPayload | null {
  if (!isPlainObject(raw)) return null;
  if (!('card' in raw) || !('sections' in raw) || !('meta' in raw)) return null;

  const card = raw.card;
  const sections = raw.sections;
  const meta = raw.meta;
  if (!isPlainObject(card) || !isPlainObject(sections) || !isPlainObject(meta)) return null;

  const name = typeof card.name === 'string' ? card.name : null;
  const coreMeaning = typeof card.coreMeaning === 'string' ? card.coreMeaning : null;
  const arcana = typeof card.arcana === 'string' ? capArcana(card.arcana) : null;
  const orientation = typeof card.orientation === 'string' ? capOrientation(card.orientation) : null;
  if (!name || !coreMeaning || !arcana || !orientation) return null;

  const str = (o: unknown, k: string): string =>
    typeof o === 'object' && o !== null && k in (o as object) && typeof (o as Record<string, unknown>)[k] === 'string'
      ? String((o as Record<string, unknown>)[k]).trim()
      : '';

  const ov = str(sections, 'overview');
  const lv = str(sections, 'love');
  const cv = str(sections, 'career');
  const ig = str(sections, 'innerGrowth');
  const ta = str(sections, 'timingAdvice');
  const ca = str(sections, 'caution');
  const af = str(sections, 'affirmation');
  if (!ov || !lv || !cv) return null;

  const mood = typeof meta.mood === 'string' ? meta.mood : '';
  const kws = Array.isArray(meta.keywords) ? meta.keywords.filter((k): k is string => typeof k === 'string') : [];
  const kwLine = kws.length ? `Keywords: ${kws.join(', ')}.` : '';
  const energyEn = [mood && `Mood: ${mood}.`, kwLine, ta && `Timing: ${ta}`, ca && `Caution: ${ca}`, ig && `Inner growth: ${ig}`, af && `Affirmation: ${af}`]
    .filter(Boolean)
    .join(' ')
    .trim();
  const energyText = energyEn.length > 0 ? energyEn : ov;

  const dup = (s: string) => ({ en: s, mn: s });

  return {
    date,
    timezone,
    sign: sign.toLowerCase(),
    card_of_the_day: {
      name: dup(name),
      arcana,
      orientation,
      core_meaning: dup(coreMeaning),
    },
    reading: {
      overview: dup(ov),
      love: dup(lv),
      career: dup(cv),
      energy: dup(energyText),
    },
  };
}

function dupStr(s: string): { en: string; mn: string } {
  const t = s.trim();
  return { en: t, mn: t };
}

function asLocaleBlock(v: unknown): { en: string; mn: string } | null {
  if (typeof v === 'string' && v.trim()) return dupStr(v);
  if (!isPlainObject(v)) return null;
  if (typeof v.en === 'string' && typeof v.mn === 'string' && v.en.trim() && v.mn.trim()) {
    return { en: v.en.trim(), mn: v.mn.trim() };
  }
  return null;
}

/**
 * Rows saved in a "flat" shape (e.g. example JSON with string `core_meaning` / `reading.*` strings)
 * or lowercase arcana/orientation — normalize to strict persisted payload.
 */
export function looseFlatTarotToPersisted(
  raw: unknown,
  sign: string,
  date: string,
  timezone: string,
): TarotPersistedPayload | null {
  if (!isPlainObject(raw)) return null;
  if (!('card_of_the_day' in raw) || !('reading' in raw)) return null;

  const cod = raw.card_of_the_day;
  const reading = raw.reading;
  if (!isPlainObject(cod) || !isPlainObject(reading)) return null;

  const nameBlock =
    asLocaleBlock(cod.name) ??
    (typeof cod.name === 'string' && cod.name.trim() ? dupStr(cod.name) : null);
  const arcanaStr = typeof cod.arcana === 'string' ? cod.arcana : '';
  const oriStr = typeof cod.orientation === 'string' ? cod.orientation : '';
  const arcana = capArcana(arcanaStr);
  const orientation = capOrientation(oriStr);
  if (!nameBlock || !arcana || !orientation) return null;

  const core = asLocaleBlock(cod.core_meaning);
  if (!core) return null;

  const ov = asLocaleBlock(reading.overview);
  const lv = asLocaleBlock(reading.love);
  const cv = asLocaleBlock(reading.career);
  const ev = asLocaleBlock(reading.energy) ?? asLocaleBlock(reading.overview);
  if (!ov || !lv || !cv || !ev) return null;

  const d = typeof raw.date === 'string' && raw.date.trim() ? raw.date.trim() : date;
  const tz = typeof raw.timezone === 'string' && raw.timezone.trim() ? raw.timezone.trim() : timezone;
  const sg = typeof raw.sign === 'string' && raw.sign.trim() ? raw.sign.trim().toLowerCase() : sign.toLowerCase();

  return {
    date: d,
    timezone: tz,
    sign: sg,
    card_of_the_day: { name: nameBlock, arcana, orientation, core_meaning: core },
    reading: { overview: ov, love: lv, career: cv, energy: ev },
  };
}
