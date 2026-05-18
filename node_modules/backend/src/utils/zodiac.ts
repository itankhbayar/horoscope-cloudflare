export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export interface ZodiacInfo {
  key: ZodiacSign;
  name: string;
  symbol: string;
  element: 'fire' | 'earth' | 'air' | 'water';
  modality: 'cardinal' | 'fixed' | 'mutable';
  rulingPlanet: string;
  startMonth: number;
  startDay: number;
}

export const ZODIAC_SIGNS: ZodiacInfo[] = [
  { key: 'aries', name: 'Aries', symbol: '\u2648', element: 'fire', modality: 'cardinal', rulingPlanet: 'Mars', startMonth: 3, startDay: 21 },
  { key: 'taurus', name: 'Taurus', symbol: '\u2649', element: 'earth', modality: 'fixed', rulingPlanet: 'Venus', startMonth: 4, startDay: 20 },
  { key: 'gemini', name: 'Gemini', symbol: '\u264A', element: 'air', modality: 'mutable', rulingPlanet: 'Mercury', startMonth: 5, startDay: 21 },
  { key: 'cancer', name: 'Cancer', symbol: '\u264B', element: 'water', modality: 'cardinal', rulingPlanet: 'Moon', startMonth: 6, startDay: 21 },
  { key: 'leo', name: 'Leo', symbol: '\u264C', element: 'fire', modality: 'fixed', rulingPlanet: 'Sun', startMonth: 7, startDay: 23 },
  { key: 'virgo', name: 'Virgo', symbol: '\u264D', element: 'earth', modality: 'mutable', rulingPlanet: 'Mercury', startMonth: 8, startDay: 23 },
  { key: 'libra', name: 'Libra', symbol: '\u264E', element: 'air', modality: 'cardinal', rulingPlanet: 'Venus', startMonth: 9, startDay: 23 },
  { key: 'scorpio', name: 'Scorpio', symbol: '\u264F', element: 'water', modality: 'fixed', rulingPlanet: 'Pluto', startMonth: 10, startDay: 23 },
  { key: 'sagittarius', name: 'Sagittarius', symbol: '\u2650', element: 'fire', modality: 'mutable', rulingPlanet: 'Jupiter', startMonth: 11, startDay: 22 },
  { key: 'capricorn', name: 'Capricorn', symbol: '\u2651', element: 'earth', modality: 'cardinal', rulingPlanet: 'Saturn', startMonth: 12, startDay: 22 },
  { key: 'aquarius', name: 'Aquarius', symbol: '\u2652', element: 'air', modality: 'fixed', rulingPlanet: 'Saturn', startMonth: 1, startDay: 20 },
  { key: 'pisces', name: 'Pisces', symbol: '\u2653', element: 'water', modality: 'mutable', rulingPlanet: 'Jupiter', startMonth: 2, startDay: 19 },
];

const SIGN_ORDER: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

export function getZodiacInfo(sign: ZodiacSign): ZodiacInfo {
  return ZODIAC_SIGNS.find((s) => s.key === sign)!;
}

export function isZodiacSign(value: string): value is ZodiacSign {
  return SIGN_ORDER.includes(value as ZodiacSign);
}

export function signFromEclipticLongitude(longitudeDeg: number): ZodiacSign {
  const normalized = ((longitudeDeg % 360) + 360) % 360;
  const idx = Math.floor(normalized / 30);
  return SIGN_ORDER[idx];
}

export function degreeWithinSign(longitudeDeg: number): number {
  const normalized = ((longitudeDeg % 360) + 360) % 360;
  return normalized - Math.floor(normalized / 30) * 30;
}

export function sunSignFromBirthDate(birthDateISO: string): ZodiacSign {
  const date = new Date(birthDateISO + 'T12:00:00Z');
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  for (let i = 0; i < ZODIAC_SIGNS.length; i++) {
    const sign = ZODIAC_SIGNS[i];
    const next = ZODIAC_SIGNS[(i + 1) % ZODIAC_SIGNS.length];
    const inSign =
      (month === sign.startMonth && day >= sign.startDay) ||
      (month === next.startMonth && day < next.startDay) ||
      (sign.key === 'capricorn' && month === 1 && day < 20) ||
      (sign.key === 'capricorn' && month === 12 && day >= 22);
    if (inSign) return sign.key;
  }
  return 'capricorn';
}
