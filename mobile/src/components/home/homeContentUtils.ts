import type { DailyHoroscope, ZodiacSign } from '@astralis/lib/types';
import { getZodiacInfo } from '@astralis/lib/zodiac';
import type { HoroscopePeriod } from './homeDateUtils';

const MAJOR_ARCANA = [
  'The Fool',
  'The Magician',
  'The High Priestess',
  'The Empress',
  'The Emperor',
  'The Hierophant',
  'The Lovers',
  'The Chariot',
  'Strength',
  'The Hermit',
  'Wheel of Fortune',
  'Justice',
  'The Hanged Man',
  'Death',
  'Temperance',
  'The Devil',
  'The Tower',
  'The Star',
  'The Moon',
  'The Sun',
  'Judgement',
  'The World',
] as const;

const CRYSTALS = [
  'Apophyllite',
  'Amethyst',
  'Rose Quartz',
  'Citrine',
  'Labradorite',
  'Moonstone',
  'Selenite',
  'Black Tourmaline',
] as const;

export function clampSnippet(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 24 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function hashToUnit(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h + input.charCodeAt(i) * (i + 3)) % 10007;
  }
  return h / 10007;
}

/** Stable “energy” fill between min and max for ring meters. */
export function stableFill(text: string, min: number, max: number): number {
  const u = hashToUnit(text);
  return min + u * (max - min);
}

export function tarotFromHoroscope(h: DailyHoroscope): { title: string; body: string } {
  const title = MAJOR_ARCANA[h.luckyNumber % MAJOR_ARCANA.length] ?? 'The Star';
  const body = clampSnippet(h.overall, 160);
  return { title, body };
}

export function crystalFromHoroscope(h: DailyHoroscope): { title: string; body: string } {
  const idx = Math.abs(h.luckyNumber + h.overall.length) % CRYSTALS.length;
  const title = CRYSTALS[idx] ?? 'Amethyst';
  const body = `Your aura resonates with ${h.luckyColor.toLowerCase()} tones today. ${clampSnippet(h.health, 140)}`;
  return { title, body };
}

export function transitFromHoroscope(h: DailyHoroscope): { body: string } {
  if (h.skyContext?.focusTransit) {
    return {
      body: clampSnippet(
        `${strongestTransitCopy(h)} ${h.career}`,
        240,
      ),
    };
  }
  return { body: clampSnippet(h.career, 220) };
}

export function moonFromHoroscope(h: DailyHoroscope, moonSign: ZodiacSign | null): { title: string; body: string } {
  const skyMoon = h.skyContext?.moonSign ? getZodiacInfo(h.skyContext.moonSign).name : null;
  const moonName = skyMoon ?? (moonSign ? getZodiacInfo(moonSign).name : 'your chart');
  const phase = h.skyContext?.moonPhase ? `${h.skyContext.moonPhase}: ` : '';
  return {
    title: `Moon in ${moonName}`,
    body: clampSnippet(`${phase}${h.health}`, 220),
  };
}

export function currentSkySummary(h: DailyHoroscope): Array<{ label: string; value: string }> {
  const sky = h.skyContext;
  if (!sky) return [];
  return [
    { label: 'Sun', value: getZodiacInfo(sky.sunSign).name },
    { label: 'Moon', value: getZodiacInfo(sky.moonSign).name },
    { label: 'Phase', value: sky.moonPhase },
  ];
}

export function strongestTransitCopy(h: DailyHoroscope): string {
  const transit = h.skyContext?.focusTransit;
  if (!transit) {
    return 'No exact major transit is peaking today, so today\'s reading leans on the current Moon phase and your natal chart.';
  }
  const house = transit.natalHouse ? ` in your ${ordinal(transit.natalHouse)} house` : '';
  return `${transit.transitBody} ${transit.aspect} your natal ${transit.natalBody}${house} at a ${transit.orb.toFixed(1)} degree orb.`;
}

export function whyThisReadingCopy(h: DailyHoroscope): string {
  const sky = h.skyContext;
  if (!sky) {
    return 'This reading uses your saved chart when available and falls back gracefully when today\'s sky data is still loading.';
  }
  const sun = getZodiacInfo(sky.sunSign).name;
  const moon = getZodiacInfo(sky.moonSign).name;
  return `Astralis starts with the actual sky: Sun in ${sun}, Moon in ${moon}, and a ${sky.moonPhase.toLowerCase()} phase. ${strongestTransitCopy(h)}`;
}

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  const mod10 = value % 10;
  if (mod10 === 1) return `${value}st`;
  if (mod10 === 2) return `${value}nd`;
  if (mod10 === 3) return `${value}rd`;
  return `${value}th`;
}

export function affirmationFromHoroscope(h: DailyHoroscope): string {
  const t = h.overall.trim();
  const end = t.search(/[.!?]/);
  if (end > 40 && end < 220) return t.slice(0, end + 1).trim();
  return clampSnippet(t, 180);
}

export function energyNarrative(h: DailyHoroscope): string {
  return `${clampSnippet(h.overall, 220)} ${clampSnippet(h.love, 160)}`;
}

/** Local tab switching for secondary cards (no extra API calls). */
export function insightBodyForPeriod(h: DailyHoroscope, period: HoroscopePeriod): string {
  switch (period) {
    case 'yesterday':
      return clampSnippet(h.love, 200);
    case 'today':
      return clampSnippet(h.overall, 200);
    case 'tomorrow':
      return clampSnippet(h.career, 200);
    case 'weekly':
      return clampSnippet(h.health, 200);
    case 'monthly':
      return clampSnippet(`${h.love} ${h.career}`, 240);
    case 'annual':
      return clampSnippet(h.overall, 300);
    default:
      return clampSnippet(h.overall, 200);
  }
}
