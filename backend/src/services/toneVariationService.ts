import type { ZodiacSign } from '../utils/zodiac';

export interface ToneVariation {
  motif: 'threshold' | 'afterglow' | 'weather' | 'echo' | 'horizon';
  cadence: 'spare' | 'soft' | 'direct';
  reflectionVerb: 'notice' | 'name' | 'release' | 'soften' | 'separate';
  sleepImage: string;
}

const MOTIFS: ToneVariation['motif'][] = ['threshold', 'afterglow', 'weather', 'echo', 'horizon'];
const CADENCES: ToneVariation['cadence'][] = ['spare', 'soft', 'direct'];
const VERBS: ToneVariation['reflectionVerb'][] = ['notice', 'name', 'release', 'soften', 'separate'];
const SLEEP_IMAGES = [
  'let the room get simpler before the mind does',
  'leave the last hour less crowded than the day',
  'make the evening small enough to hear yourself',
  'close the night without cross-examining it',
  'give the body fewer signals to sort',
];

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function toneVariationFor(dateISO: string, sign: ZodiacSign, moonPhase: string): ToneVariation {
  const seed = hash(`${dateISO}:${sign}:${moonPhase}`);
  return {
    motif: MOTIFS[seed % MOTIFS.length]!,
    cadence: CADENCES[Math.floor(seed / 7) % CADENCES.length]!,
    reflectionVerb: VERBS[Math.floor(seed / 13) % VERBS.length]!,
    sleepImage: SLEEP_IMAGES[Math.floor(seed / 17) % SLEEP_IMAGES.length]!,
  };
}

export function applyToneCadence(sentence: string, variation: ToneVariation): string {
  if (variation.cadence === 'direct') return sentence;
  if (variation.cadence === 'spare') return sentence.replace(/, especially where/g, '. Especially where');
  return sentence.replace(/ tonight/g, ' tonight, gently');
}
