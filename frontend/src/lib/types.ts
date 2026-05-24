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

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  birthDate: string;
  birthTime?: string | null;
  birthCity: string;
  birthCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezoneOffset?: number | null;
  birthDataConsent: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
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
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';

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

export interface DailyHoroscope {
  sign: ZodiacSign;
  date: string;
  overall: string;
  love: string;
  career: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
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
  milestoneReached?: null | 3 | 7 | 14 | 30 | 50 | 100;
  nextMilestone?: null | 3 | 7 | 14 | 30 | 50 | 100;
  streakSegment?: 'new' | 'building' | 'aligned' | 'devoted' | 'legendary';
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

export interface ApiError {
  status: number;
  message: string;
}

export interface NotificationPreferences {
  allEnabled: boolean;
  saleAlertsEnabled: boolean;
  horoscopesEnabled: boolean;
  transitsEnabled: boolean;
  dailyReminderEnabled: boolean;
  streakReminderEnabled: boolean;
  reEngagementEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  reminderHourLocal: number;
}

export interface NotificationPreferencesUpdate {
  allEnabled?: boolean;
  saleAlertsEnabled?: boolean;
  horoscopesEnabled?: boolean;
  transitsEnabled?: boolean;
  dailyReminderEnabled?: boolean;
  streakReminderEnabled?: boolean;
  reEngagementEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  reminderHourLocal?: number;
}

export interface PushTokenRegistrationPayload {
  expoPushToken: string;
  platform: 'ios' | 'android' | 'web' | 'unknown';
  deviceId?: string | null;
}

/** Flattened tarot API (`lang` slice). Mirrors backend `TarotApiResponse`. */
export interface TarotPublicCard {
  name: string;
  arcana: 'Major' | 'Minor';
  orientation: 'Upright' | 'Reversed';
  core_meaning: string;
}

export interface TarotPublicReading {
  overview: string;
  love: string;
  career: string;
  energy: string;
}

export interface TarotApiResponse {
  date: string;
  timezone: string;
  sign: string;
  energyScore: number;
  card_of_the_day: TarotPublicCard;
  reading: TarotPublicReading;
}
