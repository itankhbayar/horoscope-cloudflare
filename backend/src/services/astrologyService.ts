import * as Astronomy from 'astronomy-engine';
import {
  signFromEclipticLongitude,
  degreeWithinSign,
  type ZodiacSign,
} from '../utils/zodiac';

export type PlanetName =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto';

const PLANET_BODIES: Record<PlanetName, Astronomy.Body> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
};

export interface PlanetPosition {
  name: PlanetName;
  longitude: number;
  sign: ZodiacSign;
  degreeInSign: number;
  retrograde: boolean;
  house?: number;
}

export interface HouseCusp {
  number: number;
  longitude: number;
  sign: ZodiacSign;
}

export type AspectType =
  | 'conjunction'
  | 'opposition'
  | 'trine'
  | 'square'
  | 'sextile';

export interface Aspect {
  body1: PlanetName;
  body2: PlanetName;
  type: AspectType;
  orb: number;
  exactDegrees: number;
}

export interface NatalChartData {
  julianBirthDate: string;
  latitude: number;
  longitude: number;
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  risingSign: ZodiacSign | null;
  ascendant: number | null;
  midheaven: number | null;
  planets: PlanetPosition[];
  houses: HouseCusp[];
  aspects: Aspect[];
}

export interface MoonPhase {
  name: 'New Moon' | 'Waxing Crescent' | 'First Quarter' | 'Waxing Gibbous' | 'Full Moon' | 'Waning Gibbous' | 'Last Quarter' | 'Waning Crescent';
  illumination: number;
  angle: number;
}

export interface DailySkySnapshot {
  date: string;
  planets: PlanetPosition[];
  moonPhase: MoonPhase;
}

export interface TransitToNatalAspect extends Aspect {
  transitBody: PlanetName;
  natalBody: PlanetName;
  natalHouse?: number;
  natalSign: ZodiacSign;
  transitSign: ZodiacSign;
}

export interface BirthInput {
  birthDate: string;
  birthTime: string | null;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
}

const ASPECT_DEFINITIONS: { type: AspectType; angle: number; orb: number }[] = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'opposition', angle: 180, orb: 8 },
  { type: 'trine', angle: 120, orb: 7 },
  { type: 'square', angle: 90, orb: 7 },
  { type: 'sextile', angle: 60, orb: 5 },
];

const MEAN_OBLIQUITY_DEG = 23.4392911;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function buildBirthInstant(input: BirthInput): Date {
  const time = input.birthTime ?? '12:00';
  const [year, month, day] = input.birthDate.split('-').map((v) => parseInt(v, 10));
  const [hour, minute] = time.split(':').map((v) => parseInt(v, 10));
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - input.timezoneOffset * 3600 * 1000;
  return new Date(utcMs);
}

function computeGeocentricLongitude(body: Astronomy.Body, date: Date): number {
  if (body === Astronomy.Body.Moon) {
    const moon = Astronomy.EclipticGeoMoon(date);
    return normalizeAngle(moon.lon);
  }
  const vec = Astronomy.GeoVector(body, date, true);
  const ecl = Astronomy.Ecliptic(vec);
  return normalizeAngle(ecl.elon);
}

function isRetrograde(body: Astronomy.Body, date: Date): boolean {
  if (body === Astronomy.Body.Sun || body === Astronomy.Body.Moon) return false;
  const lonNow = computeGeocentricLongitude(body, date);
  const future = new Date(date.getTime() + 24 * 3600 * 1000);
  const lonFuture = computeGeocentricLongitude(body, future);
  let diff = lonFuture - lonNow;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

export function computeAscendantAndMidheaven(
  date: Date,
  latitudeDeg: number,
  longitudeDeg: number,
): { ascendant: number; midheaven: number } {
  const gmstHours = Astronomy.SiderealTime(date);
  const lstHours = (gmstHours + longitudeDeg / 15) % 24;
  const lstDeg = normalizeAngle(lstHours * 15);
  const eps = toRadians(MEAN_OBLIQUITY_DEG);
  const phi = toRadians(latitudeDeg);
  const ramcRad = toRadians(lstDeg);

  const ascRad = Math.atan2(
    Math.cos(ramcRad),
    -Math.sin(ramcRad) * Math.cos(eps) - Math.tan(phi) * Math.sin(eps),
  );
  const ascendant = normalizeAngle(toDegrees(ascRad));

  const mcRad = Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(eps));
  const midheaven = normalizeAngle(toDegrees(mcRad));

  return { ascendant, midheaven };
}

function computeEqualHouses(ascendant: number): HouseCusp[] {
  const houses: HouseCusp[] = [];
  for (let i = 0; i < 12; i++) {
    const lon = normalizeAngle(ascendant + i * 30);
    houses.push({
      number: i + 1,
      longitude: lon,
      sign: signFromEclipticLongitude(lon),
    });
  }
  return houses;
}

function findHouseForLongitude(longitude: number, houses: HouseCusp[]): number {
  for (let i = 0; i < houses.length; i++) {
    const start = houses[i].longitude;
    const end = houses[(i + 1) % houses.length].longitude;
    const diff = normalizeAngle(longitude - start);
    const span = normalizeAngle(end - start) || 360;
    if (diff < span) return houses[i].number;
  }
  return 1;
}

function computeAspects(planets: PlanetPosition[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i];
      const b = planets[j];
      let diff = Math.abs(a.longitude - b.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orb) {
          aspects.push({
            body1: a.name,
            body2: b.name,
            type: def.type,
            orb: Math.round(orb * 100) / 100,
            exactDegrees: def.angle,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

export function computeNatalChart(input: BirthInput): NatalChartData {
  const date = buildBirthInstant(input);

  const planetEntries: PlanetPosition[] = (Object.keys(PLANET_BODIES) as PlanetName[]).map((name) => {
    const body = PLANET_BODIES[name];
    const longitude = computeGeocentricLongitude(body, date);
    return {
      name,
      longitude,
      sign: signFromEclipticLongitude(longitude),
      degreeInSign: Math.round(degreeWithinSign(longitude) * 100) / 100,
      retrograde: isRetrograde(body, date),
    };
  });

  let ascendant: number | null = null;
  let midheaven: number | null = null;
  let houses: HouseCusp[] = [];
  let risingSign: ZodiacSign | null = null;

  if (input.birthTime) {
    const angles = computeAscendantAndMidheaven(date, input.latitude, input.longitude);
    ascendant = angles.ascendant;
    midheaven = angles.midheaven;
    houses = computeEqualHouses(ascendant);
    risingSign = signFromEclipticLongitude(ascendant);
    for (const planet of planetEntries) {
      planet.house = findHouseForLongitude(planet.longitude, houses);
    }
  }

  const aspects = computeAspects(planetEntries);
  const sunSign = planetEntries.find((p) => p.name === 'Sun')!.sign;
  const moonSign = planetEntries.find((p) => p.name === 'Moon')!.sign;

  return {
    julianBirthDate: date.toISOString(),
    latitude: input.latitude,
    longitude: input.longitude,
    sunSign,
    moonSign,
    risingSign,
    ascendant,
    midheaven,
    planets: planetEntries,
    houses,
    aspects,
  };
}

function moonPhaseName(angle: number): MoonPhase['name'] {
  if (angle < 22.5 || angle >= 337.5) return 'New Moon';
  if (angle < 67.5) return 'Waxing Crescent';
  if (angle < 112.5) return 'First Quarter';
  if (angle < 157.5) return 'Waxing Gibbous';
  if (angle < 202.5) return 'Full Moon';
  if (angle < 247.5) return 'Waning Gibbous';
  if (angle < 292.5) return 'Last Quarter';
  return 'Waning Crescent';
}

function computeMoonPhase(sunLongitude: number, moonLongitude: number): MoonPhase {
  const angle = normalizeAngle(moonLongitude - sunLongitude);
  const illumination = (1 - Math.cos(toRadians(angle))) / 2;
  return {
    name: moonPhaseName(angle),
    illumination: Math.round(illumination * 100) / 100,
    angle: Math.round(angle * 100) / 100,
  };
}

function dateFromISOAtNoonUTC(dateISO: string): Date {
  return new Date(`${dateISO}T12:00:00.000Z`);
}

export function computeDailySkySnapshot(dateISO: string): DailySkySnapshot {
  const date = dateFromISOAtNoonUTC(dateISO);
  const planets: PlanetPosition[] = (Object.keys(PLANET_BODIES) as PlanetName[]).map((name) => {
    const longitude = computeGeocentricLongitude(PLANET_BODIES[name], date);
    return {
      name,
      longitude,
      sign: signFromEclipticLongitude(longitude),
      degreeInSign: Math.round(degreeWithinSign(longitude) * 100) / 100,
      retrograde: isRetrograde(PLANET_BODIES[name], date),
    };
  });
  const sun = planets.find((p) => p.name === 'Sun')!;
  const moon = planets.find((p) => p.name === 'Moon')!;

  return {
    date: dateISO,
    planets,
    moonPhase: computeMoonPhase(sun.longitude, moon.longitude),
  };
}

export function computeTransitToNatalAspects(
  transits: PlanetPosition[],
  natalPlanets: PlanetPosition[],
): TransitToNatalAspect[] {
  const aspects: TransitToNatalAspect[] = [];
  for (const transit of transits) {
    for (const natal of natalPlanets) {
      let diff = Math.abs(transit.longitude - natal.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orb) {
          aspects.push({
            body1: transit.name,
            body2: natal.name,
            transitBody: transit.name,
            natalBody: natal.name,
            type: def.type,
            orb: Math.round(orb * 100) / 100,
            exactDegrees: def.angle,
            natalHouse: natal.house,
            natalSign: natal.sign,
            transitSign: transit.sign,
          });
          break;
        }
      }
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb);
}
