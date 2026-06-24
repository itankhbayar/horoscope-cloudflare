/**
 * Static fallback readings for the Chinese (lunar) zodiac. Mirrors
 * `horoscopeTemplates.ts` but far simpler — Chinese readings carry no astronomy/sky
 * layer. Used only when Claude is unavailable (outage or missing key) or for the brief
 * window before the daily cron has written the canonical reading, so a user never hits
 * an error. Deterministic per (animal + period key) so repeat reads stay consistent.
 */

import type { ChineseAnimal, ChineseElement } from './chineseZodiac';
import { getChineseAnimalInfo } from './chineseZodiac';
import type { Lang } from './lang';

export interface ChineseReadingContent {
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
}

const ANIMAL_NAMES: Record<Lang, Record<ChineseAnimal, string>> = {
  en: {
    rat: 'Rat', ox: 'Ox', tiger: 'Tiger', rabbit: 'Rabbit', dragon: 'Dragon', snake: 'Snake',
    horse: 'Horse', goat: 'Goat', monkey: 'Monkey', rooster: 'Rooster', dog: 'Dog', pig: 'Pig',
  },
  mn: {
    rat: 'Хулгана', ox: 'Үхэр', tiger: 'Бар', rabbit: 'Туулай', dragon: 'Луу', snake: 'Могой',
    horse: 'Морь', goat: 'Хонь', monkey: 'Мич', rooster: 'Тахиа', dog: 'Нохой', pig: 'Гахай',
  },
};

const COLORS_EN = [
  'Crimson', 'Imperial Gold', 'Jade Green', 'Cobalt Blue', 'Ivory White',
  'Vermilion', 'Indigo', 'Amber', 'Bronze', 'Cinnabar Red',
];
const COLORS_MN = [
  'Час улаан', 'Эзэн хааны алт', 'Хаш ногоон', 'Кобальт хөх', 'Зааны яс цагаан',
  'Улаан зосон', 'Индиго хөх', 'Хув шар', 'Хүрэл', 'Шунхан улаан',
];

// Element-keyed "overall" pools. The animal name is interpolated so even the fallback
// reads specifically to today's animal.
const OVERALL_EN: Record<ChineseElement, string[]> = {
  wood: [
    'Growth energy favors the {animal} today—plant something and tend it patiently.',
    '{animal}, flexibility wins over force; bend with the day rather than break against it.',
    'A fresh start calls to the {animal}; the first small step matters more than the plan.',
  ],
  fire: [
    'Bright momentum lifts the {animal} today—act while the spark is hot.',
    '{animal}, your warmth draws people in; lead with enthusiasm, not impatience.',
    'Passion fuels the {animal}; aim it at one thing that truly deserves the heat.',
  ],
  earth: [
    'Steady ground supports the {animal} today—build slowly and it will hold.',
    '{animal}, reliability is your quiet power; finish what you already started.',
    'Patience pays the {animal} today; small, consistent effort compounds.',
  ],
  metal: [
    'Clarity sharpens the {animal} today—cut away what no longer serves you.',
    '{animal}, discipline turns intention into result; keep your standard high.',
    'Precision favors the {animal}; do one thing properly rather than three loosely.',
  ],
  water: [
    'Intuition runs deep for the {animal} today—trust the quiet signal.',
    '{animal}, adaptability is your strength; flow around the obstacle, not into it.',
    'Reflection rewards the {animal}; listen before you decide.',
  ],
};

const OVERALL_MN: Record<ChineseElement, string[]> = {
  wood: [
    'Өсөлтийн эрч хүч өнөөдөр {animal} хүнд тустай—нэгийг тарьж, тэвчээртэй арчил.',
    '{animal}, хүчээр биш уян хатнаар ялна; өдөртэй зөрөлдөхгүй дагаж нугар.',
    'Шинэ эхлэл {animal} хүнийг дуудаж байна; төлөвлөгөөнөөс эхний жижиг алхам чухал.',
  ],
  fire: [
    'Гэрэлт түлхэц өнөөдөр {animal} хүнийг өргөнө—оч халуун байхад үйлд.',
    '{animal}, дулаан чинь хүмүүсийг татна; яаралгүй, урам зоригоор манлайл.',
    'Хүсэл тэмүүлэл {animal} хүнийг түлхэнэ; үнэхээр зохистой нэг зүйл рүү чиглүүл.',
  ],
  earth: [
    'Бат суурь өнөөдөр {animal} хүнийг тэтгэнэ—удаан бүтээвэл тогтоно.',
    '{animal}, найдвартай байдал бол чиний чимээгүй хүч; эхлүүлсэн зүйлээ дуусга.',
    'Тэвчээр өнөөдөр {animal} хүнд өгөөжтэй; жижиг ч тогтмол хүчин чармайлт хуримтлагдана.',
  ],
  metal: [
    'Тодорхой байдал өнөөдөр {animal} хүнийг хурцлана—хэрэггүй болсныг тайл.',
    '{animal}, сахилга бат санааг үр дүн болгоно; өндөр шалгуураа барь.',
    'Нямбай байдал {animal} хүнд тустай; гурвыг сулруу хийхээс нэгийг сайн хий.',
  ],
  water: [
    'Зөн совин өнөөдөр {animal} хүнд гүн ажиллана—чимээгүй дохиог итгэ.',
    '{animal}, дасан зохицох чадвар чинь хүч; саадтай мөргөлдөхгүй тойрон ур.',
    'Эргэцүүлэл {animal} хүнийг шагнана; шийдэхээсээ өмнө сонс.',
  ],
};

const LOVE_EN = [
  '{animal}, warmth shared honestly today deepens a bond that matters to you.',
  'A small, sincere gesture means more than grand words for the {animal} today.',
  '{animal}, listen for what goes unsaid; the heart speaks softly today.',
  'Connection favors the {animal}—reach out first and the warmth returns.',
];
const CAREER_EN = [
  '{animal}, steady focus on one priority moves your work further than scattered effort.',
  'A practical decision today serves the {animal} better than a bold gamble.',
  '{animal}, your reputation grows through quiet reliability, not noise.',
  'Cooperation opens a door for the {animal}; share the credit and the path widens.',
];
const HEALTH_EN = [
  '{animal}, balance effort with rest today; your energy lasts when you pace it.',
  'A simple, repeatable routine grounds the {animal} more than any quick fix.',
  '{animal}, move your body gently and let a busy mind settle.',
  'Tend to the small signals today, {animal}; ease prevents strain later.',
];

const LOVE_MN = [
  '{animal}, өнөөдөр чин сэтгэлээр хуваалцсан дулаан чухал холбоог гүнзгийрүүлнэ.',
  'Жижиг ч чин сэтгэлийн анхаарал өнөөдөр {animal} хүнд агуу үгнээс илүү.',
  '{animal}, хэлээгүй үгийг сонс; зүрх өнөөдөр зөөлөн ярина.',
  'Холбоо {animal} хүнд тустай—эхэлж хандвал дулаан эргэж ирнэ.',
];
const CAREER_MN = [
  '{animal}, нэг чухал зүйлд төвлөрвөл ажил тарсан хүчнээс хол урагшилна.',
  'Бодит шийдвэр өнөөдөр {animal} хүнд зоримог эрсдэлээс илүү тустай.',
  '{animal}, нэр хүнд чимээ шуугианаар бус чимээгүй найдвартай байдлаар өснө.',
  'Хамтын ажиллагаа {animal} хүнд хаалга нээнэ; гавьяаг хуваалцвал зам өргөснө.',
];
const HEALTH_MN = [
  '{animal}, өнөөдөр хүчээ амралттай тэнцвэржүүл; хэмнэвэл эрч хүч удаан хадгалагдана.',
  'Энгийн, давтагдах дэглэм {animal} хүнийг ямар ч түргэн аргаас илүү тогтворжуулна.',
  '{animal}, биеэ зөөлөн хөдөлгөж, завгүй ухаанаа тайвшруул.',
  'Жижиг дохиог өнөөдөр анхаар, {animal}; хөнгөн байдал хожмын ачааллаас сэргийлнэ.',
];

const BUNDLES: Record<Lang, {
  overall: Record<ChineseElement, string[]>;
  love: string[];
  career: string[];
  health: string[];
  colors: string[];
}> = {
  en: { overall: OVERALL_EN, love: LOVE_EN, career: CAREER_EN, health: HEALTH_EN, colors: COLORS_EN },
  mn: { overall: OVERALL_MN, love: LOVE_MN, career: CAREER_MN, health: HEALTH_MN, colors: COLORS_MN },
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

/** Stable seed from animal + period key (date or 'YYYY-Www'/'YYYY-MM'/'YYYY'). */
function seedFrom(animal: ChineseAnimal, key: string): number {
  let h = 0;
  const base = `${animal}-${key}`;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Deterministic template reading for an animal + period key. `key` is the daily date
 * or the period key; both seed the variant selection so reads are stable and repeatable.
 */
export function generateChineseReading(animal: ChineseAnimal, key: string, lang: Lang): ChineseReadingContent {
  const bundle = BUNDLES[lang] ?? BUNDLES.en;
  const name = (ANIMAL_NAMES[lang] ?? ANIMAL_NAMES.en)[animal];
  const fixedElement = getChineseAnimalInfo(animal).fixedElement;
  const seed = seedFrom(animal, key);
  const fill = (s: string) => s.replace(/\{animal\}/g, name);
  return {
    overall: fill(pick(bundle.overall[fixedElement], seed)),
    love: fill(pick(bundle.love, seed >> 2)),
    career: fill(pick(bundle.career, seed >> 4)),
    health: fill(pick(bundle.health, seed >> 6)),
    luckyNumber: (seed % 99) + 1,
    luckyColor: pick(bundle.colors, seed >> 8),
  };
}
