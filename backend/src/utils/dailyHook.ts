import { getZodiacInfo, type ZodiacSign } from './zodiac';
import type { Lang } from './lang';

/**
 * Single source of truth for the daily "emotional jolt" hook.
 *
 * The hook is the one flattering, slightly eerie line that makes a reading feel
 * personal and worth opening. It is shared between:
 *  - the in-app daily reading (prepended as the opening line), and
 *  - the daily push notification (teaser title/body),
 * so the push always teases the same emotional theme the user then sees inside.
 *
 * Design rules (kept deliberately narrow):
 *  - Flattering and a little uncanny, never manipulative, dark, or fear-based.
 *  - No fake certainty about the future, no medical / financial / safety claims.
 *  - Deterministic by sign + date + sky (moon), so the same day is stable and
 *    consecutive days differ.
 */

export type HookTheme = 'unspoken' | 'recognition' | 'restraint' | 'clarity' | 'turning';
export type HookElement = 'fire' | 'earth' | 'air' | 'water';

const HOOK_THEMES: HookTheme[] = ['unspoken', 'recognition', 'restraint', 'clarity', 'turning'];

const JOLT_EN: Record<HookTheme, string[]> = {
  unspoken: [
    'Someone may be reading your silence more closely than you think.',
    'A pause you barely noticed is probably saying more than your words did.',
    'The thing you are not saying is louder today than you mean it to be.',
    'What you left unsent is still doing quiet work in someone’s mind.',
  ],
  recognition: [
    'Someone has already noticed the part of you that you assume goes unseen.',
    'You are being understood more accurately than you have let yourself believe.',
    'A quiet admiration is closer to you than it looks from the inside.',
    'The version of you that you keep underselling is the one people remember.',
  ],
  restraint: [
    'Today rewards the version of you that stops explaining yourself.',
    'You owe no one the longer version of the story today.',
    'The moment you stop justifying it, it starts to make sense.',
    'Your calm is not avoidance today; it is the strongest thing in the room.',
  ],
  clarity: [
    'A small message, delay, or silence may reveal more than the actual words.',
    'You already know which small detail today is the real one.',
    'What looks like a minor signal is the honest part of the whole exchange.',
    'The quiet read you took this morning was more accurate than you admitted.',
  ],
  turning: [
    'You are acting calm, but one part of you already knows what changed.',
    'Something shifted before you decided to admit it had.',
    'A page already turned; you are only now reading the new one.',
    'You are not waiting for a sign today — you are catching up to one.',
  ],
};

const JOLT_MN: Record<HookTheme, string[]> = {
  unspoken: [
    'Таны дуугүй байдлыг хэн нэгэн үгнээс чинь илүү анхааралтай уншиж байж магадгүй.',
    'Хэлээгүй үлдээсэн зүйл чинь өнөөдөр үгнээсээ ч чанга сонсогдож магадгүй.',
    'Анзаарагдаагүй мэт өнгөрөөсөн нэг чимээгүй мөч үнэндээ хамгийн их зүйл хэлж байж болно.',
    'Илгээгүй үлдээсэн тэр зурвас хэн нэгний сэтгэлд одоо хүртэл чимээгүйхэн ажилласаар байгаа.',
  ],
  recognition: [
    'Чиний хэн ч анзаарахгүй гэж бодсон тэр талыг хэн нэгэн аль хэдийн анзаарчихсан байж магадгүй.',
    'Чамайг өөрийнхөө бодсоноос илүү зөв ойлгож байгаа хүн бий.',
    'Дуугүй биширдэг нэгэн чамд бодсоноос чинь ойрхон байж болно.',
    'Чи өөрийгөө давхар үнэлдэг тэр хувилбарыг чинь хүмүүс хамгийн сайн санадаг.',
  ],
  restraint: [
    'Өнөөдөр өөрийгөө тайлбарлахаа больсон чинь хувилбарыг өдөр шагнана.',
    'Өнөөдөр чи хэнд ч урт тайлбар өртэй биш.',
    'Зөвтгөхөө больсон тэр мөчид л бүх зүйл байрандаа орж эхлэнэ.',
    'Өнөөдөр чиний тайван байдал бол зайлсхийх биш, хамгийн хүчтэй тал чинь юм.',
  ],
  clarity: [
    'Жижигхэн мессеж, хоцролт, эсвэл чимээгүй байдал үнэн үгнээс ч илүүг илчилж магадгүй.',
    'Өнөөдрийн аль жижиг дохио нь үнэн болохыг чи дотроо аль хэдийн мэдэж байгаа.',
    'Жижиг мэт харагдаж буй тэр дохио л хамгийн үнэн хэсэг нь.',
    'Өглөө авсан чиний чимээгүй таамаг бодсоноос чинь илүү зөв байсан.',
  ],
  turning: [
    'Чи тайван дүр эсгэж байгаа ч дотор чинь нэг хэсэг нь юу өөрчлөгдсөнийг аль хэдийн мэдэж байна.',
    'Чи хүлээн зөвшөөрөхөөс өмнө нэг зүйл аль хэдийн өөрчлөгдсөн.',
    'Нэг хуудас аль хэдийн эргэсэн; чи дөнгөж уншиж эхлэж байна.',
    'Өнөөдөр чи дохио хүлээж байгаа биш, харин ирсэн дохиондоо гүйцэж байна.',
  ],
};

const PUSH_TEASER_EN: Record<HookTheme, { title: string; body: string }> = {
  unspoken: {
    title: 'What you are not saying',
    body: 'Today your silence may be saying more than you mean it to. See what the sky is reading.',
  },
  recognition: {
    title: 'You are being noticed',
    body: 'Someone may see the part of you that you assume goes unseen. Today’s reading knows the angle.',
  },
  restraint: {
    title: 'Stop explaining yourself',
    body: 'Today rewards the version of you that drops the longer story. See why.',
  },
  clarity: {
    title: 'Read the small signal',
    body: 'A message, a delay, a pause — one of them is the honest one today. Find out which.',
  },
  turning: {
    title: 'Something already shifted',
    body: 'You are acting calm, but part of you knows what changed. Today’s sky names it.',
  },
};

/**
 * Themes are chosen from the Moon (element + phase) only, so the global push and
 * the per-sign in-app reading land on the same theme for a given date.
 */
export function selectHookTheme(moonElement: HookElement, moonPhase: string): HookTheme {
  if (moonPhase.includes('Full')) return 'unspoken';
  if (moonElement === 'water') return 'recognition';
  if (moonElement === 'air') return 'restraint';
  if (moonElement === 'earth') return 'clarity';
  return 'turning';
}

export function hookSeed(sign: ZodiacSign, dateISO: string, moonSign?: ZodiacSign, moonPhase?: string): number {
  const text = `${sign}|${dateISO}|${moonSign ?? ''}|${moonPhase ?? ''}`;
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function emotionalJolt(theme: HookTheme, lang: Lang, seed: number): string {
  const pool = (lang === 'mn' ? JOLT_MN : JOLT_EN)[theme];
  return pool[seed % pool.length];
}

export function pushTeaserForTheme(theme: HookTheme): { title: string; body: string } {
  return PUSH_TEASER_EN[theme];
}

export interface DailyHookInput {
  sign: ZodiacSign;
  dateISO: string;
  lang: Lang;
  moonSign?: ZodiacSign;
  moonPhase?: string;
}

export interface DailyHook {
  theme: HookTheme;
  jolt: string;
}

export function buildDailyHook(input: DailyHookInput): DailyHook {
  const moonElement: HookElement = input.moonSign
    ? getZodiacInfo(input.moonSign).element
    : getZodiacInfo(input.sign).element;
  const moonPhase = input.moonPhase ?? '';
  const theme = selectHookTheme(moonElement, moonPhase);
  const seed = hookSeed(input.sign, input.dateISO, input.moonSign, input.moonPhase);
  return { theme, jolt: emotionalJolt(theme, input.lang, seed) };
}

/** Flat list of every jolt line, used by safety tests. */
export function allJoltLines(): string[] {
  const lines: string[] = [];
  for (const theme of HOOK_THEMES) {
    lines.push(...JOLT_EN[theme], ...JOLT_MN[theme]);
  }
  return lines;
}

export { HOOK_THEMES };
