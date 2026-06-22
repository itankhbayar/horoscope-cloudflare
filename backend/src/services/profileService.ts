import { eq, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import {
  birthProfiles,
  dailyRitualHistory,
  natalCharts,
  users,
  type BirthProfile,
  type NatalChart,
  type User,
} from '../db/schema';
import { computeNatalChart, type NatalChartData } from './astrologyService';
import { currentStreakDateISO } from './streakService';
import { getZodiacInfo, type ZodiacSign } from '../utils/zodiac';
import { lookupCity } from '../utils/cities';

export interface ProfilePayload {
  user: {
    id: string;
    email: string;
    fullName: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    timezone: string | null;
    createdAt: string;
    isPremium: boolean;
    streakCount: number;
    longestStreakCount: number;
    streakFreezes: number;
    streakFreezeCap: number;
  };
  ritualHistory: RitualHistoryDay[];
  birthProfile: BirthProfile | null;
  natalChart: (Omit<NatalChart, 'planets' | 'houses' | 'aspects'> & {
    planets: NatalChartData['planets'];
    houses: NatalChartData['houses'];
    aspects: NatalChartData['aspects'];
    sunInfo: ReturnType<typeof getZodiacInfo>;
    moonInfo: ReturnType<typeof getZodiacInfo>;
    risingInfo: ReturnType<typeof getZodiacInfo> | null;
  }) | null;
}

export interface UpdateProfileInput {
  displayName?: string;
  fullName?: string;
  bio?: string | null;
  timezone?: string;
  timezoneOffset?: number;
  birthDate?: string;
  birthTime?: string | null;
  birthCity?: string;
  birthCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RitualHistoryDay {
  date: string;
  completed: boolean;
}

export class ProfileAvatarError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ProfileAvatarError';
    this.status = status;
  }
}

export async function getFullProfile(db: DB, userId: string): Promise<ProfilePayload> {
  const [user, profile, chart, ritualHistory] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).get(),
    db.select().from(birthProfiles).where(eq(birthProfiles.userId, userId)).get(),
    db.select().from(natalCharts).where(eq(natalCharts.userId, userId)).get(),
    getRitualHistory(db, userId),
  ]);
  if (!user) throw new Error('User not found');

  let natalChart: ProfilePayload['natalChart'] = null;
  if (chart) {
    natalChart = {
      ...chart,
      planets: chart.planets as NatalChartData['planets'],
      houses: chart.houses as NatalChartData['houses'],
      aspects: chart.aspects as NatalChartData['aspects'],
      sunInfo: getZodiacInfo(chart.sunSign as ZodiacSign),
      moonInfo: getZodiacInfo(chart.moonSign as ZodiacSign),
      risingInfo: chart.risingSign ? getZodiacInfo(chart.risingSign as ZodiacSign) : null,
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      displayName: user.displayName?.trim() || user.fullName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone ?? null,
      createdAt: user.createdAt,
      isPremium: Boolean(user.isPremium),
      streakCount: user.streakCount,
      longestStreakCount: user.longestStreakCount,
      streakFreezes: user.streakFreezes,
      streakFreezeCap: user.isPremium ? 3 : 1,
    },
    ritualHistory,
    birthProfile: profile ?? null,
    natalChart,
  };
}

export async function getRitualHistory(db: DB, userId: string, todayISO = currentStreakDateISO()): Promise<RitualHistoryDay[]> {
  const dates = lastNDates(todayISO, 30);
  const startDate = dates[0] ?? todayISO;
  try {
    const rows = await db
      .select({ ritualDate: dailyRitualHistory.ritualDate })
      .from(dailyRitualHistory)
      .where(sql`${dailyRitualHistory.userId} = ${userId} AND ${dailyRitualHistory.ritualDate} >= ${startDate}`)
      .orderBy(sql`${dailyRitualHistory.ritualDate} ASC`);
    const completed = new Set(rows.map((row) => row.ritualDate));
    return dates.map((date) => ({ date, completed: completed.has(date) }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('no such table: daily_ritual_history') || message.includes('no such column: ritual_date')) {
      // eslint-disable-next-line no-console
      console.error('[ritual-history-fallback]', {
        userId,
        reason: 'missing_daily_ritual_history_schema',
        message,
      });
      return dates.map((date) => ({ date, completed: false }));
    }
    throw error;
  }
}

function lastNDates(todayISO: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(`${todayISO}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

export async function recomputeNatalChart(db: DB, userId: string): Promise<void> {
  const profile = await db
    .select()
    .from(birthProfiles)
    .where(eq(birthProfiles.userId, userId))
    .get();
  if (!profile) throw new Error('Birth profile not found');
  const chart = computeNatalChart({
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezoneOffset: profile.timezoneOffset,
  });
  const existing = await db
    .select()
    .from(natalCharts)
    .where(eq(natalCharts.userId, userId))
    .get();
  if (existing) {
    await db
      .update(natalCharts)
      .set({
        sunSign: chart.sunSign,
        moonSign: chart.moonSign,
        risingSign: chart.risingSign,
        planets: chart.planets,
        houses: chart.houses,
        aspects: chart.aspects,
      })
      .where(eq(natalCharts.userId, userId));
  } else {
    await db.insert(natalCharts).values({
      id: crypto.randomUUID(),
      userId,
      sunSign: chart.sunSign,
      moonSign: chart.moonSign,
      risingSign: chart.risingSign,
      planets: chart.planets,
      houses: chart.houses,
      aspects: chart.aspects,
    });
  }
}

function sanitizeText(input: string): string {
  return input.replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export async function updateProfile(
  db: DB,
  userId: string,
  input: UpdateProfileInput,
): Promise<ProfilePayload> {
  const userPatch: Record<string, unknown> = {};
  if (input.displayName !== undefined || input.fullName !== undefined) {
    const displayName = sanitizeText(input.displayName ?? input.fullName ?? '');
    if (displayName.length < 2 || displayName.length > 60) {
      throw new Error('Display name must be 2 to 60 characters');
    }
    userPatch.displayName = displayName;
  }
  if (input.bio !== undefined) {
    const bio = sanitizeText(input.bio ?? '');
    if (bio.length > 280) {
      throw new Error('Bio must be 280 characters or less');
    }
    userPatch.bio = bio.length > 0 ? bio : null;
  }
  if (input.timezone !== undefined) {
    const timezone = sanitizeText(input.timezone);
    if (!timezone || !isValidTimezone(timezone)) {
      throw new Error('Timezone must be a valid IANA timezone');
    }
    userPatch.timezone = timezone;
  }
  if (Object.keys(userPatch).length > 0) {
    userPatch.updatedAt = sql`(CURRENT_TIMESTAMP)`;
    await db.update(users).set(userPatch).where(eq(users.id, userId));
  }

  if (
    input.birthDate !== undefined ||
    input.birthTime !== undefined ||
    input.birthCity !== undefined ||
    input.birthCountry !== undefined ||
    input.latitude !== undefined ||
    input.longitude !== undefined ||
    input.timezoneOffset !== undefined
  ) {
    await updateBirthProfile(db, userId, input);
    await recomputeNatalChart(db, userId);
  }

  return getFullProfile(db, userId);
}

async function updateBirthProfile(db: DB, userId: string, input: UpdateProfileInput): Promise<void> {
  const existing = await db
    .select()
    .from(birthProfiles)
    .where(eq(birthProfiles.userId, userId))
    .get();
  if (!existing) throw new Error('Birth profile not found');

  let latitude = input.latitude ?? existing.latitude;
  let longitude = input.longitude ?? existing.longitude;
  let timezoneOffset = input.timezoneOffset ?? existing.timezoneOffset;
  let birthCountry = input.birthCountry !== undefined ? input.birthCountry : existing.birthCountry;
  const birthCity = sanitizeText(input.birthCity ?? existing.birthCity);

  if (input.birthCity !== undefined && (input.latitude === undefined || input.longitude === undefined)) {
    const city = lookupCity(birthCity);
    if (!city) {
      throw new Error('Birth city not recognized. Please choose from suggestions or provide coordinates.');
    }
    latitude = city.latitude;
    longitude = city.longitude;
    timezoneOffset = input.timezoneOffset ?? city.timezoneOffset;
    birthCountry = input.birthCountry !== undefined ? input.birthCountry : city.country;
  }

  await db
    .update(birthProfiles)
    .set({
      birthDate: input.birthDate ?? existing.birthDate,
      birthTime: input.birthTime !== undefined ? input.birthTime : existing.birthTime,
      birthCity,
      birthCountry,
      latitude,
      longitude,
      timezoneOffset,
    })
    .where(eq(birthProfiles.userId, userId));
}

export async function updateProfileAvatar(
  db: DB,
  userId: string,
  storage: R2Bucket | undefined,
  publicBaseUrl: string,
  file: File,
): Promise<{ avatarUrl: string }> {
  if (!storage) {
    throw new ProfileAvatarError(
      'Avatar storage is not configured. Add r2_buckets binding STORAGE in wrangler config.',
      503,
    );
  }
  const extByType: Record<string, 'jpg' | 'png' | 'webp'> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = extByType[file.type.toLowerCase()];
  if (!ext) {
    throw new ProfileAvatarError('Avatar must be jpg, jpeg, png, or webp');
  }
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new ProfileAvatarError('Avatar must be 5MB or smaller', 413);
  }

  const key = `profile/${userId}.${ext}`;
  await storage.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=3600',
    },
  });
  const avatarUrl = `${publicBaseUrl.replace(/\/$/, '')}/${key}`;

  await db
    .update(users)
    .set({ avatarUrl, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(eq(users.id, userId));

  return { avatarUrl };
}
