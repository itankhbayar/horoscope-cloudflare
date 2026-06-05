import type { Lang } from './lang';

/**
 * Accuracy Loop — the next-day reflection beat. Given how yesterday's reading landed
 * (1 didn't land · 2 partly · 3 this was my day), pick a short, calm acknowledgment
 * line to show atop today's reading. Fully deterministic and static: no LLM, no DB,
 * no engine changes — the core reading text is untouched and this is attached as a
 * sibling field by the route. Returns null when there is nothing to acknowledge.
 */

export type Resonance = 1 | 2 | 3;

export interface ReflectionAck {
  reflection: string;
}

export function isResonance(value: unknown): value is Resonance {
  return value === 1 || value === 2 || value === 3;
}

const ACK_LINES: Record<Lang, Record<Resonance, string>> = {
  en: {
    1: 'Yesterday felt distant. Today the sky reads a little softer.',
    2: "Yesterday partly landed. Let's see what today brings.",
    3: 'Yesterday was yours. Today continues the thread.',
  },
  mn: {
    1: 'Өчигдөр хол санагдсан. Өнөөдрийн тэнгэр арай зөөлөн.',
    2: 'Өчигдөр хэсэгчлэн тусав. Өнөөдөр юу авчрахыг харъя.',
    3: 'Өчигдөр яг таных байлаа. Өнөөдөр энэ урсгал үргэлжилнэ.',
  },
};

export function buildReflectionAck(resonance: number, lang: Lang): ReflectionAck | null {
  if (!isResonance(resonance)) return null;
  const byLang = ACK_LINES[lang] ?? ACK_LINES.en;
  return { reflection: byLang[resonance] };
}
