/** Zodiac sign slug used across API routes and UI. */
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

/** Authenticated user profile fields returned by `/api/auth/me` and profile routes. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  timezone?: string | null;
  createdAt?: string;
  isPremium?: boolean;
}

export interface City {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
}

export interface BirthProfile {
  id: string;
  userId: string;
  birthDate: string;
  birthTime: string | null;
  birthCity: string;
  birthCountry: string | null;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  createdAt: string;
}

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

export type AspectType = 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';

export interface Aspect {
  body1: PlanetName;
  body2: PlanetName;
  type: AspectType;
  orb: number;
  exactDegrees: number;
}

export interface NatalChart {
  id: string;
  userId: string;
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  risingSign: ZodiacSign | null;
  planets: PlanetPosition[];
  houses: HouseCusp[];
  aspects: Aspect[];
  computedAt: string;
  sunInfo: ZodiacInfo;
  moonInfo: ZodiacInfo;
  risingInfo: ZodiacInfo | null;
}

export interface ProfilePayload {
  user: AuthUser;
  birthProfile: BirthProfile | null;
  natalChart: NatalChart | null;
}

/** Daily horoscope API payload (`GET /api/horoscope/daily/:sign`). */
export interface DailyHoroscope {
  sign: ZodiacSign;
  date: string;
  lang?: string;
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
  sunSign?: ZodiacSign;
  moonSign?: ZodiacSign;
  risingSign?: ZodiacSign | null;
}

/** Canonical alias for daily horoscope reading content. */
export type HoroscopeReading = DailyHoroscope;

export interface CompatibilityResult {
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

export interface NotificationPreferences {
  allEnabled: boolean;
  saleAlertsEnabled: boolean;
  horoscopesEnabled: boolean;
  transitsEnabled: boolean;
}

/** Flattened tarot card (`lang` slice). */
export interface TarotPublicCard {
  name: string;
  arcana: 'Major' | 'Minor';
  orientation: 'Upright' | 'Reversed';
  core_meaning: string;
}

/** Canonical alias for public tarot card DTO. */
export type TarotCard = TarotPublicCard;

export interface TarotPublicReading {
  overview: string;
  love: string;
  career: string;
  energy: string;
}

export type TarotReading = TarotPublicReading;

export interface TarotApiResponse {
  date: string;
  timezone: string;
  sign: string;
  energyScore: number;
  card_of_the_day: TarotPublicCard;
  reading: TarotPublicReading;
}
