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
  streakCount?: number;
  longestStreakCount?: number;
  streakFreezes?: number;
  streakFreezeCap?: number;
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
  ritualHistory?: RitualHistoryDay[];
  birthProfile: BirthProfile | null;
  natalChart: NatalChart | null;
}

export interface RitualHistoryDay {
  date: string;
  completed: boolean;
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
  skyContext?: {
    sunSign: ZodiacSign;
    moonSign: ZodiacSign;
    moonPhase: string;
    focusTransit?: {
      transitBody: string;
      natalBody: string;
      aspect: string;
      orb: number;
      natalHouse?: number;
      transitSign: ZodiacSign;
      natalSign: ZodiacSign;
    };
  };
  sunSign?: ZodiacSign;
  moonSign?: ZodiacSign;
  risingSign?: ZodiacSign | null;
  streakCount?: number;
  longestStreakCount?: number;
  streakLastDate?: string | null;
  streakFreezes?: number;
  streakFreezeAwarded?: boolean;
  streakFreezeCap?: number;
  streakFreezeAwardReason?: null | '7_day' | '30_day' | '100_day';
  isNewStreakDay?: boolean;
  streakPreservedByFreeze?: boolean;
  milestoneReached?: null | 3 | 7 | 14 | 30 | 50 | 100 | 365;
  nextMilestone?: null | 3 | 7 | 14 | 30 | 50 | 100 | 365;
  streakSegment?: 'new' | 'building' | 'aligned' | 'devoted' | 'legendary';
}

export interface DailyRitualCompletion {
  currentStreak: number;
  longestStreak: number;
  freezeCount: number;
  freezeCap: number;
  nextMilestone: null | 3 | 7 | 14 | 30 | 50 | 100 | 365;
  milestoneReached: null | 3 | 7 | 14 | 30 | 50 | 100 | 365;
  streakFreezeAwarded: boolean;
  alreadyCompletedToday: boolean;
  shouldCelebrate: boolean;
  completedDate: string;
  streakLastDate: string | null;
  streakPreservedByFreeze: boolean;
  streakFreezeAwardReason: null | '7_day' | '30_day' | '100_day';
  streakSegment: 'new' | 'building' | 'aligned' | 'devoted' | 'legendary';
}

/** Canonical alias for daily horoscope reading content. */
export type HoroscopeReading = DailyHoroscope;

export type AtmosphereKey =
  | 'tension'
  | 'intimacy'
  | 'clarity'
  | 'momentum'
  | 'uncertainty'
  | 'reflection'
  | 'socialOpenness'
  | 'emotionalVolatility';

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
  majorAspects: Array<{
    body1: PlanetName;
    body2: PlanetName;
    type: AspectType;
    orb: number;
  }>;
  mercuryActivity: string;
  venusMarsTension: string | null;
  retrogradeBodies: PlanetName[];
  eclipseWindow: {
    active: boolean;
    note: string;
  };
  shareLine: string;
}

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
