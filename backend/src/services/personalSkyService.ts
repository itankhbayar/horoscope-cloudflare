import { buildGlobalSkyToday, type AtmosphereKey, type GlobalSkyToday } from './globalSkyService';
import { applyToneCadence, toneVariationFor, type ToneVariation } from './toneVariationService';
import { getZodiacInfo, sunSignFromBirthDate, type ZodiacSign } from '../utils/zodiac';

export type PersonalSkyInput =
  | { sign: ZodiacSign; birthDate?: never }
  | { birthDate: string; sign?: never };

export interface PersonalSkyRitualCard {
  id: 'tonight-window' | 'emotional-weather' | 'reflection-prompt' | 'relationship-atmosphere' | 'dream-sleep-tone';
  title: string;
  body: string;
  signal: AtmosphereKey;
}

export interface PersonalSkyLayer {
  date: string;
  sign: ZodiacSign;
  personalization: 'zodiac_sign' | 'birth_date';
  resonanceScore: number;
  headline: string;
  howTonightAffectsYou: string;
  emotionalWeather: string;
  relationshipAtmosphere: string;
  reflectionPrompt: string;
  dreamSleepTone: string;
  quietHourSuggestion: string;
  ritualCards: PersonalSkyRitualCard[];
  premiumBridge: string;
  sky: Pick<GlobalSkyToday, 'date' | 'moonSign' | 'moonPhase' | 'atmosphere' | 'majorAspects'>;
}

const SIGN_ORDER: ZodiacSign[] = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function signDistance(a: ZodiacSign, b: ZodiacSign): number {
  const ai = SIGN_ORDER.indexOf(a);
  const bi = SIGN_ORDER.indexOf(b);
  const raw = Math.abs(ai - bi);
  return Math.min(raw, 12 - raw);
}

function strongestAtmosphere(atmosphere: GlobalSkyToday['atmosphere']): AtmosphereKey {
  return Object.entries(atmosphere).sort((a, b) => b[1] - a[1])[0]?.[0] as AtmosphereKey ?? 'reflection';
}

function signFromInput(input: PersonalSkyInput): { sign: ZodiacSign; personalization: PersonalSkyLayer['personalization'] } {
  if ('sign' in input && input.sign) return { sign: input.sign, personalization: 'zodiac_sign' };
  return { sign: sunSignFromBirthDate(input.birthDate), personalization: 'birth_date' };
}

function resonanceScore(sign: ZodiacSign, sky: GlobalSkyToday): number {
  const signInfo = getZodiacInfo(sign);
  const moonInfo = getZodiacInfo(sky.moonSign);
  const distance = signDistance(sign, sky.moonSign);
  let score = 42;
  if (sign === sky.moonSign) score += 28;
  if (signInfo.element === moonInfo.element) score += 18;
  if (signInfo.modality === moonInfo.modality) score += 9;
  score += Math.max(0, 12 - distance * 3);
  if (signInfo.rulingPlanet === 'Mercury') score += sky.atmosphere.clarity >= sky.atmosphere.uncertainty ? 8 : 3;
  if (signInfo.rulingPlanet === 'Venus') score += sky.atmosphere.intimacy >= 55 ? 8 : 2;
  if (signInfo.rulingPlanet === 'Mars') score += sky.atmosphere.momentum >= 55 || sky.atmosphere.tension >= 60 ? 8 : 2;
  if (signInfo.rulingPlanet === 'Moon') score += sky.atmosphere.emotionalVolatility >= 55 ? 9 : 4;
  if (signInfo.rulingPlanet === 'Saturn') score += sky.atmosphere.reflection >= 55 ? 8 : 3;
  return clamp(score);
}

function howTonightAffects(sign: ZodiacSign, sky: GlobalSkyToday, score: number, variation: ToneVariation): string {
  const name = getZodiacInfo(sign).name;
  const moonName = getZodiacInfo(sky.moonSign).name;
  let sentence: string;
  if (score >= 74) {
    sentence = `${name} placements may feel tonight's ${moonName} Moon more personally, especially where a small emotional signal has been asking for a cleaner name.`;
  } else if (sky.atmosphere.tension >= 62) {
    sentence = `${name} energy may ${variation.reflectionVerb} pressure around tone, timing, or unfinished honesty tonight without needing to turn it into a crisis.`;
  } else if (sky.atmosphere.intimacy >= 62) {
    sentence = `${name} placements may read closeness more accurately tonight, including the kind that arrives quietly instead of dramatically.`;
  } else if (sky.atmosphere.clarity >= 62) {
    sentence = `${name} energy is supported by direct language tonight; vague agreement may feel less convincing than usual.`;
  } else {
    sentence = `${name} placements may feel the collective weather as a subtle adjustment in pace, mood, and emotional availability.`;
  }
  return applyToneCadence(sentence, variation);
}

function relationshipLine(sign: ZodiacSign, sky: GlobalSkyToday): string {
  const name = getZodiacInfo(sign).name;
  if (sky.venusMarsTension) {
    return `${name} energy may be more sensitive to mixed signals tonight; attraction and irritation can sit closer together than people admit.`;
  }
  if (sky.atmosphere.socialOpenness >= 58) {
    return `${name} placements may find conversation easier when nobody tries to win the emotional room.`;
  }
  return `${name} placements may benefit from fewer social performances and one honest sentence said at the right volume.`;
}

function reflectionPrompt(sign: ZodiacSign, sky: GlobalSkyToday, variation: ToneVariation): string {
  const name = getZodiacInfo(sign).name;
  if (sky.atmosphere.reflection >= 60) return `Where did ${name} discipline become emotional distance, and what would it mean to ${variation.reflectionVerb} that without judging it?`;
  if (sky.atmosphere.tension >= 62) return `What truth are you trying to make sound more polite than it feels?`;
  if (sky.atmosphere.intimacy >= 62) return `What kind of closeness feels safe only when nobody names it?`;
  return `What did your body understand before your mind organized it?`;
}

function dreamTone(sky: GlobalSkyToday, variation: ToneVariation): string {
  if (sky.atmosphere.emotionalVolatility >= 62) {
    return `Sleep may work best after a small emotional closing ritual: dim light, fewer inputs, and ${variation.sleepImage}.`;
  }
  if (sky.atmosphere.reflection >= 60) {
    return `Tonight has a review quality. ${variation.sleepImage.charAt(0).toUpperCase()}${variation.sleepImage.slice(1)}.`;
  }
  return `The dream tone is quiet but responsive; ${variation.sleepImage}.`;
}

export function buildPersonalSkyLayer(input: PersonalSkyInput, dateISO: string): PersonalSkyLayer {
  const sky = buildGlobalSkyToday(dateISO);
  const { sign, personalization } = signFromInput(input);
  const variation = toneVariationFor(dateISO, sign, sky.moonPhase);
  const info = getZodiacInfo(sign);
  const score = resonanceScore(sign, sky);
  const strongest = strongestAtmosphere(sky.atmosphere);
  const howTonight = howTonightAffects(sign, sky, score, variation);
  const relationship = relationshipLine(sign, sky);
  const prompt = reflectionPrompt(sign, sky, variation);
  const sleep = dreamTone(sky, variation);
  const emotionalWeather = `The strongest personal overlay is ${strongest.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`)}. Treat it as ${variation.motif === 'weather' ? 'weather' : `a ${variation.motif}`}, not a verdict.`;

  return {
    date: dateISO,
    sign,
    personalization,
    resonanceScore: score,
    headline: `${info.name} resonance for tonight`,
    howTonightAffectsYou: howTonight,
    emotionalWeather,
    relationshipAtmosphere: relationship,
    reflectionPrompt: prompt,
    dreamSleepTone: sleep,
    quietHourSuggestion: 'A quiet hour is enough: lower the inputs, name the mood, leave one conversation unfinished if forcing it would distort it.',
    ritualCards: [
      {
        id: 'tonight-window',
        title: "Tonight's window",
        signal: strongest,
        body: howTonight,
      },
      {
        id: 'emotional-weather',
        title: 'Emotional weather',
        signal: strongest,
        body: emotionalWeather,
      },
      {
        id: 'relationship-atmosphere',
        title: 'Relationship atmosphere',
        signal: sky.venusMarsTension ? 'tension' : 'socialOpenness',
        body: relationship,
      },
      {
        id: 'reflection-prompt',
        title: 'Reflection prompt',
        signal: 'reflection',
        body: prompt,
      },
      {
        id: 'dream-sleep-tone',
        title: 'Dream / sleep tone',
        signal: 'reflection',
        body: sleep,
      },
    ],
    premiumBridge: 'Deeper personal timing opens when Astralis can read this atmosphere through your Moon, rising sign, houses, and long-term patterns.',
    sky: {
      date: sky.date,
      moonSign: sky.moonSign,
      moonPhase: sky.moonPhase,
      atmosphere: sky.atmosphere,
      majorAspects: sky.majorAspects,
    },
  };
}
