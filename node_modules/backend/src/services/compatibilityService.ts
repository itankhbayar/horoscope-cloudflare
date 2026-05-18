import type { DB } from '../db/client';
import { compatibilityResults, natalCharts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getZodiacInfo, type ZodiacSign } from '../utils/zodiac';
import type { Lang } from '../utils/lang';

export interface CompatibilityResponse {
  sign1: ZodiacSign;
  sign2: ZodiacSign;
  user1Id?: string;
  user2Id?: string;
  overallScore: number;
  loveScore: number;
  friendshipScore: number;
  communicationScore: number;
  summary: string;
  highlights: string[];
}

const ELEMENT_AFFINITY: Record<string, Record<string, number>> = {
  fire: { fire: 85, air: 90, earth: 55, water: 50 },
  earth: { earth: 85, water: 90, fire: 55, air: 50 },
  air: { air: 85, fire: 90, water: 55, earth: 50 },
  water: { water: 85, earth: 90, air: 55, fire: 50 },
};

const MODALITY_AFFINITY: Record<string, Record<string, number>> = {
  cardinal: { cardinal: 60, fixed: 75, mutable: 80 },
  fixed: { fixed: 65, cardinal: 75, mutable: 70 },
  mutable: { mutable: 70, cardinal: 80, fixed: 70 },
};

const SIGN_NAMES: Record<Lang, Record<ZodiacSign, string>> = {
  en: {
    aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
    leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
    sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
  },
  mn: {
    aries: 'Хонь', taurus: 'Үхэр', gemini: 'Ихэр', cancer: 'Мэлхий',
    leo: 'Арслан', virgo: 'Охин', libra: 'Жинлүүр', scorpio: 'Хилэнц',
    sagittarius: 'Нум', capricorn: 'Матар', aquarius: 'Хумх', pisces: 'Загас',
  },
};

const ELEMENT_NAMES: Record<Lang, Record<string, string>> = {
  en: { fire: 'fire', earth: 'earth', air: 'air', water: 'water' },
  mn: { fire: 'гал', earth: 'шороо', air: 'агаар', water: 'ус' },
};

const MODALITY_NAMES: Record<Lang, Record<string, string>> = {
  en: { cardinal: 'cardinal', fixed: 'fixed', mutable: 'mutable' },
  mn: { cardinal: 'үндсэн', fixed: 'тогтвортой', mutable: 'хувирамтгай' },
};

interface CopyBundle {
  highStrong: (a: string, b: string) => string;
  highMedium: (a: string, b: string) => string;
  highLow: (a: string, b: string) => string;
  sameElement: (el: string) => string;
  oppositeSigns: () => string;
  highLove: () => string;
  lowComm: () => string;
  highFriend: () => string;
  pairing: (a: string, ela: string, moda: string, b: string, elb: string, modb: string, tier: 'high' | 'mid' | 'low') => string;
}

const COPY: Record<Lang, CopyBundle> = {
  en: {
    highStrong: (a, b) => `${a} and ${b} share an unusually harmonious bond.`,
    highMedium: (a, b) => `${a} and ${b} have meaningful chemistry with room to grow.`,
    highLow: (a, b) => `${a} and ${b} face natural friction that, when respected, can lead to growth.`,
    sameElement: (el) => `Both signs share the ${el} element, fostering deep mutual understanding.`,
    oppositeSigns: () => `As polar opposites, they balance each other in powerful ways.`,
    highLove: () => 'Romantic chemistry burns bright between them.',
    lowComm: () => 'Communication needs intentional effort to flourish.',
    highFriend: () => 'They make exceptional friends and confidants.',
    pairing: (a, ela, moda, b, elb, modb, tier) => {
      const word = tier === 'high' ? 'remarkable' : tier === 'mid' ? 'workable' : 'challenging';
      return `${a} (${ela}/${moda}) and ${b} (${elb}/${modb}) form a ${word} pairing.`;
    },
  },
  mn: {
    highStrong: (a, b) => `${a} ба ${b} ер бусын зохицолтой холбоотой.`,
    highMedium: (a, b) => `${a} ба ${b} утга учиртай химийн урвалтай боловч өсөх боломжтой.`,
    highLow: (a, b) => `${a} ба ${b}-ын хооронд байгалийн саатал бий боловч хүндэтгэвэл өсөлт авчирна.`,
    sameElement: (el) => `Хоёулаа ${el} махбодтой, гүнзгий харилцан ойлголцолыг бүрдүүлнэ.`,
    oppositeSigns: () => `Туйлын эсрэг тал болохын хувьд бие биеэ хүчтэй тэнцвэржүүлнэ.`,
    highLove: () => 'Тэдний хооронд романтик химийн урвал тод гялалзана.',
    lowComm: () => 'Харилцаа цэцэглэхийн тулд тусгай хүчин чармайлт шаардлагатай.',
    highFriend: () => 'Тэд онцгой найз нөхөд, итгэмжит хүмүүс болдог.',
    pairing: (a, ela, moda, b, elb, modb, tier) => {
      const word = tier === 'high' ? 'гайхалтай' : tier === 'mid' ? 'боломжит' : 'сорилттой';
      return `${a} (${ela}/${moda}) ба ${b} (${elb}/${modb}) ${word} хослолыг бүрдүүлнэ.`;
    },
  },
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function getSignIndex(sign: ZodiacSign): number {
  const order: ZodiacSign[] = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];
  return order.indexOf(sign);
}

function buildSummary(
  sign1: ZodiacSign,
  sign2: ZodiacSign,
  lang: Lang,
  scores: { overall: number; love: number; friendship: number; communication: number },
): { summary: string; highlights: string[] } {
  const a = getZodiacInfo(sign1);
  const b = getZodiacInfo(sign2);
  const aName = SIGN_NAMES[lang][sign1];
  const bName = SIGN_NAMES[lang][sign2];
  const aEl = ELEMENT_NAMES[lang][a.element];
  const bEl = ELEMENT_NAMES[lang][b.element];
  const aMod = MODALITY_NAMES[lang][a.modality];
  const bMod = MODALITY_NAMES[lang][b.modality];
  const sameElement = a.element === b.element;
  const oppositeSign = Math.abs(getSignIndex(sign1) - getSignIndex(sign2)) === 6;
  const copy = COPY[lang];
  const highlights: string[] = [];

  if (scores.overall >= 80) highlights.push(copy.highStrong(aName, bName));
  else if (scores.overall >= 60) highlights.push(copy.highMedium(aName, bName));
  else highlights.push(copy.highLow(aName, bName));
  if (sameElement) highlights.push(copy.sameElement(aEl));
  if (oppositeSign) highlights.push(copy.oppositeSigns());
  if (scores.love >= 80) highlights.push(copy.highLove());
  if (scores.communication < 55) highlights.push(copy.lowComm());
  if (scores.friendship >= 80) highlights.push(copy.highFriend());

  const tier = scores.overall >= 75 ? 'high' : scores.overall >= 55 ? 'mid' : 'low';
  const summary = `${copy.pairing(aName, aEl, aMod, bName, bEl, bMod, tier)} ${highlights[0]}`;
  return { summary, highlights };
}

export function computeSignCompatibility(
  sign1: ZodiacSign,
  sign2: ZodiacSign,
  lang: Lang,
): CompatibilityResponse {
  const a = getZodiacInfo(sign1);
  const b = getZodiacInfo(sign2);

  const elementScore = ELEMENT_AFFINITY[a.element][b.element];
  const modalityScore = MODALITY_AFFINITY[a.modality][b.modality];

  const oppositeBonus = Math.abs(getSignIndex(sign1) - getSignIndex(sign2)) === 6 ? 8 : 0;
  const sameSignBonus = sign1 === sign2 ? 5 : 0;

  const love = clamp(elementScore * 0.65 + modalityScore * 0.35 + oppositeBonus + sameSignBonus);
  const friendship = clamp(elementScore * 0.55 + modalityScore * 0.45 + sameSignBonus);
  const communication = clamp(elementScore * 0.4 + modalityScore * 0.6);
  const overall = clamp((love + friendship + communication) / 3);

  const { summary, highlights } = buildSummary(sign1, sign2, lang, {
    overall, love, friendship, communication,
  });

  return {
    sign1,
    sign2,
    overallScore: overall,
    loveScore: love,
    friendshipScore: friendship,
    communicationScore: communication,
    summary,
    highlights,
  };
}

export async function compareUsers(
  db: DB,
  user1Id: string,
  user2Id: string,
  lang: Lang,
): Promise<CompatibilityResponse> {
  const [chart1, chart2] = await Promise.all([
    db.select().from(natalCharts).where(eq(natalCharts.userId, user1Id)).get(),
    db.select().from(natalCharts).where(eq(natalCharts.userId, user2Id)).get(),
  ]);
  if (!chart1 || !chart2) throw new Error('Both users must have a natal chart');
  const result = computeSignCompatibility(
    chart1.sunSign as ZodiacSign,
    chart2.sunSign as ZodiacSign,
    lang,
  );
  return { ...result, user1Id, user2Id };
}

export async function persistCompatibility(
  db: DB,
  result: CompatibilityResponse,
): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(compatibilityResults).values({
    id,
    sign1: result.sign1,
    sign2: result.sign2,
    user1Id: result.user1Id ?? null,
    user2Id: result.user2Id ?? null,
    overallScore: result.overallScore,
    loveScore: result.loveScore,
    friendshipScore: result.friendshipScore,
    communicationScore: result.communicationScore,
    summary: result.summary,
  });
  return id;
}
