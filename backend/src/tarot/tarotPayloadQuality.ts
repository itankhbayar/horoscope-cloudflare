import { TAROT_COPY_REV } from './tarotCopyRev';
import type { TarotPersistedPayload } from './tarotTypes';

/** Cyrillic block used by Mongolian copy in shipped templates. */
const CYRILLIC_RE = /[\u0400-\u052F]/;

/** Old frozen MN overview (pre–copyRev) still in D1 — substring markers. */
const LEGACY_MN_SNIPPETS = [
  'Эргүү-ээр',
  'тойрч харна',
  'Сэтгэлийн өнгө',
  'сонголтын утсыг зөөлөн',
  'гарвал өдрийг',
];

function trimEq(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

/** Long-ish `mn` that contains no Cyrillic is almost certainly English (or dup), not real MN. */
function mnLooksLatinOnlyProse(mn: string, minLen: number): boolean {
  const t = mn.trim();
  if (t.length < minLen) return false;
  return !CYRILLIC_RE.test(t);
}

/**
 * Rows where `mn` was never filled (dup of `en`), pasted English, or duplicate sections
 * should be replaced (prewarm or GET repair) so `lang=mn` serves real Mongolian.
 */
export function tarotPayloadNeedsBilingualRefresh(payload: TarotPersistedPayload): boolean {
  if (payload.copyRev !== TAROT_COPY_REV) return true;

  const ovMn = payload.reading.overview.mn;
  for (const snip of LEGACY_MN_SNIPPETS) {
    if (ovMn.includes(snip)) return true;
  }

  const blocks = [
    payload.card_of_the_day.name,
    payload.card_of_the_day.core_meaning,
    payload.reading.overview,
    payload.reading.love,
    payload.reading.career,
    payload.reading.energy,
  ];
  for (const b of blocks) {
    if (trimEq(b.en, b.mn)) return true;
  }

  const ov = payload.reading.overview.mn.trim();
  const enE = payload.reading.energy.mn.trim();
  if (ov.length > 40 && ov === enE) return true;

  if (mnLooksLatinOnlyProse(payload.card_of_the_day.name.mn, 10)) return true;
  if (mnLooksLatinOnlyProse(payload.card_of_the_day.core_meaning.mn, 18)) return true;

  for (const key of ['overview', 'love', 'career', 'energy'] as const) {
    if (mnLooksLatinOnlyProse(payload.reading[key].mn, 18)) return true;
  }

  return false;
}
