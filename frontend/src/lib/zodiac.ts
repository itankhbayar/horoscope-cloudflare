import type { ZodiacInfo, ZodiacSign } from './types';

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

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '\u2609', Moon: '\u263D', Mercury: '\u263F', Venus: '\u2640', Mars: '\u2642',
  Jupiter: '\u2643', Saturn: '\u2644', Uranus: '\u2645', Neptune: '\u2646', Pluto: '\u2647',
};

const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: '\u260C', opposition: '\u260D', trine: '\u25B3',
  square: '\u25A1', sextile: '\u26B9',
};

export function getZodiacInfo(sign: ZodiacSign): ZodiacInfo {
  return ZODIAC_SIGNS.find((s) => s.key === sign)!;
}

export function planetSymbol(name: string): string {
  return PLANET_SYMBOLS[name] ?? '*';
}

export function aspectSymbol(type: string): string {
  return ASPECT_SYMBOLS[type] ?? '~';
}

export function elementColor(element: string): string {
  switch (element) {
    case 'fire': return '#ff8a5c';
    case 'earth': return '#7bbf6a';
    case 'air': return '#9ec6ff';
    case 'water': return '#7eb6e6';
    default: return '#c9a84c';
  }
}
