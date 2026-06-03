import type { HookTheme } from './dailyHook';
import type { Lang } from './lang';

/**
 * Premium Pattern Memory — Phase 1 (deterministic, no AI / LLM / external calls).
 *
 * Given the deterministic daily hook theme and a lightweight history of the themes the
 * user has seen, this surfaces a soft "the app remembers you" note when today's theme has
 * already appeared recently. It only reads theme keywords + dates — never reading content.
 *
 * Safety rules baked in:
 *  - Never claims certainty; copy only uses "may / might / could".
 *  - No medical, mental-health, or financial claims.
 */

/** Only the last 14 days of theme history are ever considered. */
export const PATTERN_MEMORY_RETENTION_DAYS = 14;
/** A recurrence within this window counts as "this week". */
export const PATTERN_MEMORY_WEEK_DAYS = 7;

export interface ThemeHistoryEntry {
  theme: HookTheme;
  /** ISO date (YYYY-MM-DD). */
  date: string;
}

export type PatternMemoryKind = 'recent' | 'multiple';

export interface PatternMemory {
  theme: HookTheme;
  kind: PatternMemoryKind;
  /** Days since the most recent prior occurrence; null when `kind === 'multiple'`. */
  daysAgo: number | null;
  /** How many prior days (within retention) carried the same theme. */
  occurrences: number;
}

export interface PatternMemoryBlock extends PatternMemory {
  title: string;
  body: string;
}

/** Whole-day difference `b - a` using UTC midnight, so DST never shifts the count. */
export function daysBetweenISO(aISO: string, bISO: string): number {
  const a = Date.parse(`${aISO}T00:00:00.000Z`);
  const b = Date.parse(`${bISO}T00:00:00.000Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.round((b - a) / 86_400_000);
}

/** Drop entries outside the retention window (and any future-dated rows). */
export function pruneThemeHistory(
  history: ThemeHistoryEntry[],
  todayISO: string,
  retentionDays = PATTERN_MEMORY_RETENTION_DAYS,
): ThemeHistoryEntry[] {
  return history.filter((entry) => {
    const gap = daysBetweenISO(entry.date, todayISO);
    return Number.isFinite(gap) && gap >= 1 && gap <= retentionDays;
  });
}

/**
 * Decide whether today's theme echoes the recent past.
 *
 * Algorithm:
 *  1. Keep only prior entries (1..14 days ago) — today itself and anything older is ignored.
 *  2. Look at the entries that match today's theme.
 *  3. None → return null (no memory; this covers "insufficient history").
 *  4. Two or more such days within the last week → 'multiple' ("more than once this week").
 *  5. Otherwise → 'recent', carrying the distance to the closest prior occurrence.
 */
export function detectPatternMemory(
  todayTheme: HookTheme,
  todayISO: string,
  history: ThemeHistoryEntry[],
): PatternMemory | null {
  const prior = pruneThemeHistory(history, todayISO);
  const sameTheme = prior.filter((entry) => entry.theme === todayTheme);
  if (sameTheme.length === 0) return null;

  const withinWeek = sameTheme.filter(
    (entry) => daysBetweenISO(entry.date, todayISO) <= PATTERN_MEMORY_WEEK_DAYS,
  );
  if (withinWeek.length >= 2) {
    return { theme: todayTheme, kind: 'multiple', daysAgo: null, occurrences: withinWeek.length };
  }

  const closest = sameTheme.reduce((best, entry) =>
    daysBetweenISO(entry.date, todayISO) < daysBetweenISO(best.date, todayISO) ? entry : best,
  );
  return {
    theme: todayTheme,
    kind: 'recent',
    daysAgo: daysBetweenISO(closest.date, todayISO),
    occurrences: sameTheme.length,
  };
}

const THEME_LABEL: Record<Lang, Record<HookTheme, string>> = {
  en: {
    unspoken: 'the unspoken',
    recognition: 'recognition',
    restraint: 'restraint',
    clarity: 'clarity',
    turning: 'a turning point',
  },
  mn: {
    unspoken: 'хэлээгүй үлдсэн зүйл',
    recognition: 'таних',
    restraint: 'тэвчээр',
    clarity: 'тодорхой байдал',
    turning: 'эргэлтийн цэг',
  },
};

const THEME_SOFT_FOLLOWUP: Record<Lang, Record<HookTheme, string>> = {
  en: {
    unspoken: 'Something left unsaid may still be waiting for you.',
    recognition: 'The need to be seen may not be fully resolved yet.',
    restraint: 'You might still be holding part of that back.',
    clarity: 'A small signal from then could still matter now.',
    turning: 'Part of that shift may still be settling.',
  },
  mn: {
    unspoken: 'Хэлээгүй үлдсэн нэг зүйл чамайг хүлээж байж магадгүй.',
    recognition: 'Анзаарагдах хэрэгцээ бүрэн арилаагүй байж магадгүй.',
    restraint: 'Та түүний нэг хэсгийг хадгалсаар байж магадгүй.',
    clarity: 'Тэр үеийн жижиг дохио одоо ч хамаатай байж болно.',
    turning: 'Тэр өөрчлөлтийн нэг хэсэг одоо ч тогтож байж магадгүй.',
  },
};

const TITLE: Record<Lang, string> = {
  en: 'Pattern Memory',
  mn: 'Хэв маягийн ой',
};

function recentBodyEn(memory: PatternMemory): string {
  const label = THEME_LABEL.en[memory.theme];
  const followup = THEME_SOFT_FOLLOWUP.en[memory.theme];
  if (memory.daysAgo === 1) {
    return `Yesterday's theme was ${label}. ${followup}`;
  }
  return `${memory.daysAgo} days ago, ${label} appeared. ${followup}`;
}

function recentBodyMn(memory: PatternMemory): string {
  const label = THEME_LABEL.mn[memory.theme];
  const followup = THEME_SOFT_FOLLOWUP.mn[memory.theme];
  if (memory.daysAgo === 1) {
    return `Өчигдрийн сэдэв ${label} байсан. ${followup}`;
  }
  return `${memory.daysAgo} өдрийн өмнө ${label} илэрсэн. ${followup}`;
}

/** Soft, certainty-free copy for a detected memory. */
export function patternMemoryCopy(memory: PatternMemory, lang: Lang): { title: string; body: string } {
  const title = TITLE[lang] ?? TITLE.en;
  if (memory.kind === 'multiple') {
    const body =
      lang === 'mn'
        ? 'Энэ долоо хоногт ижил сэтгэл хөдлөлийн хэв маяг нэгээс олон удаа илэрлээ. Та одоо ч түүгээр дайран өнгөрч байж магадгүй.'
        : 'The same emotional pattern has surfaced more than once this week. You might still be moving through it.';
    return { title, body };
  }
  return { title, body: lang === 'mn' ? recentBodyMn(memory) : recentBodyEn(memory) };
}

/** Convenience: detect + attach copy in one call. Returns null when there is no memory. */
export function buildPatternMemoryBlock(
  todayTheme: HookTheme,
  todayISO: string,
  history: ThemeHistoryEntry[],
  lang: Lang,
): PatternMemoryBlock | null {
  const memory = detectPatternMemory(todayTheme, todayISO, history);
  if (!memory) return null;
  const { title, body } = patternMemoryCopy(memory, lang);
  return { ...memory, title, body };
}
