/**
 * Chinese (lunar) zodiac compatibility. The Chinese counterpart of
 * `compatibilityService.ts`: same response shape (overall/love/friendship/communication
 * scores + summary + highlights), but scored from Chinese rules — trines (compatibility
 * triangles), six harmonies (secret friends), six clashes (conflicts), and the Wu Xing
 * five-element affinity — instead of the Western element/modality matrices.
 */

import {
  getChineseAnimalInfo,
  type ChineseAnimal,
  type ChineseElement,
} from '../utils/chineseZodiac';
import type { Lang } from '../utils/lang';

export interface ChineseCompatibilityResponse {
  animal1: ChineseAnimal;
  animal2: ChineseAnimal;
  overallScore: number;
  loveScore: number;
  friendshipScore: number;
  communicationScore: number;
  summary: string;
  highlights: string[];
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

const ELEMENT_NAMES: Record<Lang, Record<ChineseElement, string>> = {
  en: { wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water' },
  mn: { wood: 'мод', fire: 'гал', earth: 'шороо', metal: 'төмөр', water: 'ус' },
};

// Wu Xing generating (productive) cycle: each element feeds the next.
const GENERATES: Record<ChineseElement, ChineseElement> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
};
// Controlling (overcoming) cycle: each element restrains another.
const CONTROLS: Record<ChineseElement, ChineseElement> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
};

function elementAffinity(a: ChineseElement, b: ChineseElement): number {
  if (a === b) return 78;
  if (GENERATES[a] === b || GENERATES[b] === a) return 90; // productive pair
  if (CONTROLS[a] === b || CONTROLS[b] === a) return 55; // controlling pair
  return 68;
}

type Relation = 'secretFriend' | 'trine' | 'same' | 'conflict' | 'neutral';

function relationBetween(a: ChineseAnimal, b: ChineseAnimal): Relation {
  const ia = getChineseAnimalInfo(a);
  if (ia.secretFriend === b) return 'secretFriend';
  if (ia.conflictAnimal === b) return 'conflict';
  if (a === b) return 'same';
  if (ia.trineGroup === getChineseAnimalInfo(b).trineGroup) return 'trine';
  return 'neutral';
}

// The animal relationship (trine / six-harmony / six-clash) is the dominant Chinese-zodiac
// signal, so it carries more weight than the Wu Xing element affinity below.
const RELATION_BASE: Record<Relation, number> = {
  secretFriend: 94,
  trine: 88,
  same: 72,
  neutral: 62,
  conflict: 40,
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

interface CopyBundle {
  highStrong: (a: string, b: string) => string;
  highMedium: (a: string, b: string) => string;
  highLow: (a: string, b: string) => string;
  trine: () => string;
  secretFriend: () => string;
  conflict: () => string;
  sameElement: (el: string) => string;
  productiveElement: (a: string, b: string) => string;
  highLove: () => string;
  lowComm: () => string;
  pairing: (a: string, b: string, tier: 'high' | 'mid' | 'low') => string;
}

const COPY: Record<Lang, CopyBundle> = {
  en: {
    highStrong: (a, b) => `${a} and ${b} share an unusually harmonious bond.`,
    highMedium: (a, b) => `${a} and ${b} have meaningful chemistry with room to grow.`,
    highLow: (a, b) => `${a} and ${b} face natural friction that, when respected, can still grow.`,
    trine: () => 'They belong to the same compatibility triangle — a natural, easy alliance.',
    secretFriend: () => 'As secret friends, they quietly support and protect each other.',
    conflict: () => 'As clashing signs, they must work consciously to avoid butting heads.',
    sameElement: (el) => `Both carry the ${el} element, deepening mutual understanding.`,
    productiveElement: (a, b) => `Their ${a} and ${b} elements nourish each other.`,
    highLove: () => 'Romantic warmth comes easily between them.',
    lowComm: () => 'Communication needs intentional effort to flourish.',
    pairing: (a, b, tier) => {
      const word = tier === 'high' ? 'remarkable' : tier === 'mid' ? 'workable' : 'challenging';
      return `${a} and ${b} form a ${word} pairing.`;
    },
  },
  mn: {
    highStrong: (a, b) => `${a} ба ${b} ер бусын зохицолтой холбоотой.`,
    highMedium: (a, b) => `${a} ба ${b} утга учиртай татацтай боловч өсөх боломжтой.`,
    highLow: (a, b) => `${a} ба ${b}-ын хооронд байгалийн саатал бий ч хүндэтгэвэл өсөж чадна.`,
    trine: () => 'Тэд нэг зохицлын гурвалжинд багтдаг — байгалийн, амар холбоо.',
    secretFriend: () => 'Нууц нөхдийн хувьд бие биеэ чимээгүй дэмжиж, хамгаална.',
    conflict: () => 'Зөрчилтэй жилүүдийн хувьд мөргөлдөхөөс ухамсартай зайлсхийх хэрэгтэй.',
    sameElement: (el) => `Хоёулаа ${el} махбодтой, харилцан ойлголцол гүнзгийрнэ.`,
    productiveElement: (a, b) => `${a}, ${b} махбод нь бие биенээ тэжээдэг.`,
    highLove: () => 'Тэдний хооронд романтик дулаан амархан төрнө.',
    lowComm: () => 'Харилцаа цэцэглэхийн тулд ухамсартай хүчин чармайлт шаардлагатай.',
    pairing: (a, b, tier) => {
      const word = tier === 'high' ? 'гайхалтай' : tier === 'mid' ? 'боломжит' : 'сорилттой';
      return `${a} ба ${b} ${word} хослолыг бүрдүүлнэ.`;
    },
  },
};

function buildSummary(
  animal1: ChineseAnimal,
  animal2: ChineseAnimal,
  lang: Lang,
  relation: Relation,
  scores: { overall: number; love: number; friendship: number; communication: number },
): { summary: string; highlights: string[] } {
  const a = getChineseAnimalInfo(animal1);
  const b = getChineseAnimalInfo(animal2);
  const aName = ANIMAL_NAMES[lang][animal1];
  const bName = ANIMAL_NAMES[lang][animal2];
  const copy = COPY[lang];
  const highlights: string[] = [];

  if (scores.overall >= 80) highlights.push(copy.highStrong(aName, bName));
  else if (scores.overall >= 60) highlights.push(copy.highMedium(aName, bName));
  else highlights.push(copy.highLow(aName, bName));

  if (relation === 'secretFriend') highlights.push(copy.secretFriend());
  else if (relation === 'trine') highlights.push(copy.trine());
  else if (relation === 'conflict') highlights.push(copy.conflict());

  if (a.fixedElement === b.fixedElement) {
    highlights.push(copy.sameElement(ELEMENT_NAMES[lang][a.fixedElement]));
  } else if (GENERATES[a.fixedElement] === b.fixedElement || GENERATES[b.fixedElement] === a.fixedElement) {
    highlights.push(copy.productiveElement(ELEMENT_NAMES[lang][a.fixedElement], ELEMENT_NAMES[lang][b.fixedElement]));
  }

  if (scores.love >= 80) highlights.push(copy.highLove());
  if (scores.communication < 55) highlights.push(copy.lowComm());

  const tier = scores.overall >= 75 ? 'high' : scores.overall >= 55 ? 'mid' : 'low';
  const summary = `${copy.pairing(aName, bName, tier)} ${highlights[0]}`;
  return { summary, highlights };
}

export function computeChineseCompatibility(
  animal1: ChineseAnimal,
  animal2: ChineseAnimal,
  lang: Lang,
): ChineseCompatibilityResponse {
  const a = getChineseAnimalInfo(animal1);
  const b = getChineseAnimalInfo(animal2);

  const relation = relationBetween(animal1, animal2);
  const relationScore = RELATION_BASE[relation];
  const elementScore = elementAffinity(a.fixedElement, b.fixedElement);

  const love = clamp(relationScore * 0.7 + elementScore * 0.3 + (relation === 'secretFriend' ? 4 : 0));
  const friendship = clamp(relationScore * 0.6 + elementScore * 0.4);
  const communication = clamp(relationScore * 0.55 + elementScore * 0.45);
  const overall = clamp((love + friendship + communication) / 3);

  const { summary, highlights } = buildSummary(animal1, animal2, lang, relation, {
    overall, love, friendship, communication,
  });

  return {
    animal1,
    animal2,
    overallScore: overall,
    loveScore: love,
    friendshipScore: friendship,
    communicationScore: communication,
    summary,
    highlights,
  };
}
