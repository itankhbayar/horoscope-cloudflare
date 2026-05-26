import { computeDailySkySnapshot, type AspectType, type DailySkySnapshot, type PlanetName, type PlanetPosition } from './astrologyService';
import { getZodiacInfo, type ZodiacSign } from '../utils/zodiac';

export type AtmosphereKey =
  | 'tension'
  | 'intimacy'
  | 'clarity'
  | 'momentum'
  | 'uncertainty'
  | 'reflection'
  | 'socialOpenness'
  | 'emotionalVolatility';

export interface GlobalSkyAspect {
  body1: PlanetName;
  body2: PlanetName;
  type: AspectType;
  orb: number;
}

export interface GlobalSkyCard {
  id: string;
  title: string;
  body: string;
  signal: AtmosphereKey;
}

export interface GlobalSkyToday {
  date: string;
  moonSign: ZodiacSign;
  moonPhase: string;
  headline: string;
  summary: string;
  cards: GlobalSkyCard[];
  atmosphere: Record<AtmosphereKey, number>;
  majorAspects: GlobalSkyAspect[];
  mercuryActivity: string;
  venusMarsTension: string | null;
  retrogradeBodies: PlanetName[];
  eclipseWindow: {
    active: boolean;
    note: string;
  };
  shareLine: string;
}

const ASPECTS: Array<{ type: AspectType; angle: number; orb: number }> = [
  { type: 'conjunction', angle: 0, orb: 6 },
  { type: 'opposition', angle: 180, orb: 6 },
  { type: 'trine', angle: 120, orb: 5 },
  { type: 'square', angle: 90, orb: 5 },
  { type: 'sextile', angle: 60, orb: 4 },
];

const ATMOSPHERE_KEYS: AtmosphereKey[] = [
  'tension',
  'intimacy',
  'clarity',
  'momentum',
  'uncertainty',
  'reflection',
  'socialOpenness',
  'emotionalVolatility',
];

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function angularDistance(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a - b));
  return diff > 180 ? 360 - diff : diff;
}

function planet(sky: DailySkySnapshot, name: PlanetName): PlanetPosition {
  return sky.planets.find((p) => p.name === name)!;
}

function computeGlobalAspects(planets: PlanetPosition[]): GlobalSkyAspect[] {
  const selected = planets.filter((p) => ['Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.name));
  const aspects: GlobalSkyAspect[] = [];
  for (let i = 0; i < selected.length; i += 1) {
    for (let j = i + 1; j < selected.length; j += 1) {
      const a = selected[i]!;
      const b = selected[j]!;
      const diff = angularDistance(a.longitude, b.longitude);
      for (const aspect of ASPECTS) {
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= aspect.orb) {
          aspects.push({
            body1: a.name,
            body2: b.name,
            type: aspect.type,
            orb: Math.round(orb * 100) / 100,
          });
          break;
        }
      }
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb);
}

function baseAtmosphere(moonSign: ZodiacSign, phase: string): Record<AtmosphereKey, number> {
  const element = getZodiacInfo(moonSign).element;
  const values: Record<AtmosphereKey, number> = {
    tension: 38,
    intimacy: 42,
    clarity: 44,
    momentum: 42,
    uncertainty: 36,
    reflection: 44,
    socialOpenness: 42,
    emotionalVolatility: 36,
  };

  if (element === 'fire') {
    values.momentum += 20;
    values.emotionalVolatility += 12;
    values.reflection -= 8;
  } else if (element === 'earth') {
    values.clarity += 10;
    values.momentum -= 4;
    values.tension += 4;
  } else if (element === 'air') {
    values.socialOpenness += 18;
    values.clarity += 8;
    values.uncertainty += 8;
  } else {
    values.intimacy += 20;
    values.reflection += 12;
    values.emotionalVolatility += 10;
  }

  if (phase.includes('Full')) {
    values.emotionalVolatility += 18;
    values.clarity += 10;
    values.tension += 8;
  } else if (phase.includes('New')) {
    values.reflection += 18;
    values.uncertainty += 12;
    values.momentum -= 8;
  } else if (phase.includes('Waning')) {
    values.reflection += 14;
    values.socialOpenness -= 6;
  } else if (phase.includes('Waxing')) {
    values.momentum += 12;
  }

  return Object.fromEntries(ATMOSPHERE_KEYS.map((key) => [key, clamp(values[key])])) as Record<AtmosphereKey, number>;
}

function applyAspectAtmosphere(
  values: Record<AtmosphereKey, number>,
  aspects: GlobalSkyAspect[],
  retrogrades: PlanetName[],
): Record<AtmosphereKey, number> {
  const next = { ...values };
  for (const aspect of aspects.slice(0, 6)) {
    const hard = aspect.type === 'square' || aspect.type === 'opposition' || aspect.type === 'conjunction';
    const soft = aspect.type === 'trine' || aspect.type === 'sextile';
    const involves = (name: PlanetName) => aspect.body1 === name || aspect.body2 === name;
    const weight = Math.max(4, Math.round(12 - aspect.orb));
    if (hard) {
      next.tension += weight;
      next.uncertainty += Math.round(weight / 2);
    }
    if (soft) {
      next.clarity += weight;
      next.socialOpenness += Math.round(weight / 2);
    }
    if (involves('Moon')) next.emotionalVolatility += hard ? weight : 4;
    if (involves('Mercury')) next.clarity += soft ? weight : -Math.round(weight / 2);
    if (involves('Venus')) next.intimacy += soft ? weight : 5;
    if (involves('Mars')) next.momentum += weight;
    if (involves('Saturn')) next.reflection += weight;
  }
  if (retrogrades.includes('Mercury')) {
    next.reflection += 15;
    next.clarity -= 8;
    next.uncertainty += 10;
  }
  for (const key of ATMOSPHERE_KEYS) next[key] = clamp(next[key]);
  return next;
}

function aspectPhrase(aspect: GlobalSkyAspect): string {
  return `${aspect.body1} ${aspect.type} ${aspect.body2}`;
}

function mercuryActivity(mercury: PlanetPosition, aspects: GlobalSkyAspect[]): string {
  const mercuryAspects = aspects.filter((a) => a.body1 === 'Mercury' || a.body2 === 'Mercury');
  const signName = getZodiacInfo(mercury.sign).name;
  if (mercury.retrograde) {
    return `Mercury is retrograde in ${signName}, so interpretation improves when people slow down and check the story underneath the words.`;
  }
  const hard = mercuryAspects.find((a) => a.type === 'square' || a.type === 'opposition');
  if (hard) return `Mercury in ${signName} is under ${hard.type} tension, so conversations may carry more hidden meaning than usual.`;
  const soft = mercuryAspects.find((a) => a.type === 'trine' || a.type === 'sextile');
  if (soft) return `Mercury in ${signName} has a clearer channel today; direct language lands better than performance.`;
  return `Mercury in ${signName} keeps the mental weather steady enough for careful naming.`;
}

function venusMarsTension(aspects: GlobalSkyAspect[]): string | null {
  const direct = aspects.find(
    (a) =>
      ((a.body1 === 'Venus' && a.body2 === 'Mars') || (a.body1 === 'Mars' && a.body2 === 'Venus')) &&
      (a.type === 'square' || a.type === 'opposition' || a.type === 'conjunction'),
  );
  if (!direct) return null;
  return `Venus and Mars are in ${direct.type}, making desire harder to disguise and easier to misread.`;
}

function eclipseWindow(phase: string, moon: PlanetPosition): GlobalSkyToday['eclipseWindow'] {
  const nearLunation = phase === 'New Moon' || phase === 'Full Moon';
  return {
    active: false,
    note: nearLunation
      ? `This is a ${phase.toLowerCase()} window with heightened lunar emphasis. Eclipse timing requires lunar-node proximity, so Astralis does not label it an eclipse without that signal.`
      : `No eclipse window is flagged from today's available sky snapshot.`,
  };
}

function headline(moonSign: ZodiacSign, atmosphere: Record<AtmosphereKey, number>): string {
  const moonName = getZodiacInfo(moonSign).name;
  if (atmosphere.tension >= 62) return `The Moon in ${moonName} makes the emotional subtext harder to ignore.`;
  if (atmosphere.intimacy >= 62) return `The Moon in ${moonName} brings private feeling closer to the surface.`;
  if (atmosphere.clarity >= 62) return `The Moon in ${moonName} favors cleaner perception and fewer evasions.`;
  if (atmosphere.momentum >= 62) return `The Moon in ${moonName} gives the day a pulse that wants movement.`;
  return `The Moon in ${moonName} shapes today's collective emotional weather.`;
}

function buildCards(
  sky: DailySkySnapshot,
  aspects: GlobalSkyAspect[],
  atmosphere: Record<AtmosphereKey, number>,
  mercuryCopy: string,
  venusMarsCopy: string | null,
): GlobalSkyCard[] {
  const moonName = getZodiacInfo(planet(sky, 'Moon').sign).name;
  const strongest = aspects[0];
  return [
    {
      id: 'moon-weather',
      title: 'Moon weather',
      signal: 'intimacy',
      body: `The Moon crossing ${moonName} heightens ${getZodiacInfo(planet(sky, 'Moon').sign).element === 'water' ? 'emotional pattern recognition' : 'the way people regulate closeness and distance'} today.`,
    },
    {
      id: 'conversation-signal',
      title: 'Conversation signal',
      signal: atmosphere.clarity >= atmosphere.uncertainty ? 'clarity' : 'uncertainty',
      body: mercuryCopy,
    },
    {
      id: 'relational-field',
      title: 'Relational field',
      signal: venusMarsCopy ? 'tension' : 'socialOpenness',
      body: venusMarsCopy ?? 'Social timing is easier when warmth is direct and expectations are not hidden inside politeness.',
    },
    {
      id: 'strongest-transit',
      title: 'Strongest sky note',
      signal: strongest && (strongest.type === 'square' || strongest.type === 'opposition') ? 'tension' : 'reflection',
      body: strongest
        ? `${aspectPhrase(strongest)} is the tightest collective aspect in this snapshot, giving the atmosphere a ${strongest.type === 'square' || strongest.type === 'opposition' ? 'sharper edge' : 'more coherent current'}.`
        : 'No tight major collective aspect dominates this snapshot, so the Moon phase carries more of the daily tone.',
    },
  ];
}

export function buildGlobalSkyToday(dateISO: string): GlobalSkyToday {
  const sky = computeDailySkySnapshot(dateISO);
  const aspects = computeGlobalAspects(sky.planets);
  const retrogradeBodies = sky.planets.filter((p) => p.retrograde).map((p) => p.name);
  const moon = planet(sky, 'Moon');
  const mercury = planet(sky, 'Mercury');
  const base = baseAtmosphere(moon.sign, sky.moonPhase.name);
  const atmosphere = applyAspectAtmosphere(base, aspects, retrogradeBodies);
  const mercuryCopy = mercuryActivity(mercury, aspects);
  const venusMarsCopy = venusMarsTension(aspects);
  const head = headline(moon.sign, atmosphere);
  const cards = buildCards(sky, aspects, atmosphere, mercuryCopy, venusMarsCopy);
  const retrogradeCopy = retrogradeBodies.length
    ? `${retrogradeBodies.join(', ')} retrograde adds a review-and-revise undertone.`
    : 'No personal planet retrograde dominates the snapshot.';

  return {
    date: dateISO,
    moonSign: moon.sign,
    moonPhase: sky.moonPhase.name,
    headline: head,
    summary: `${head} ${mercuryCopy} Tonight favors ${atmosphere.tension >= atmosphere.socialOpenness ? 'honesty over harmony' : 'cleaner timing and less performative agreement'}.`,
    cards,
    atmosphere,
    majorAspects: aspects.slice(0, 5),
    mercuryActivity: mercuryCopy,
    venusMarsTension: venusMarsCopy,
    retrogradeBodies,
    eclipseWindow: eclipseWindow(sky.moonPhase.name, moon),
    shareLine: `${head} ${retrogradeCopy}`,
  };
}
