import { eq, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import {
  birthProfiles,
  natalCharts,
  users,
  type BirthProfile,
  type NatalChart,
  type User,
} from '../db/schema';
import { computeNatalChart, type NatalChartData } from './astrologyService';
import { getZodiacInfo, type ZodiacSign } from '../utils/zodiac';

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
  };
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
  const [user, profile, chart] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).get(),
    db.select().from(birthProfiles).where(eq(birthProfiles.userId, userId)).get(),
    db.select().from(natalCharts).where(eq(natalCharts.userId, userId)).get(),
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
    },
    birthProfile: profile ?? null,
    natalChart,
  };
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
  const displayName = sanitizeText(input.displayName ?? input.fullName ?? '');
  const bio = sanitizeText(input.bio ?? '');
  const timezone =
    input.timezone !== undefined
      ? sanitizeText(input.timezone)
      : input.timezoneOffset !== undefined
        ? 'UTC'
        : '';
  if (displayName.length < 2 || displayName.length > 60) {
    throw new Error('Display name must be 2 to 60 characters');
  }
  if (bio.length > 280) {
    throw new Error('Bio must be 280 characters or less');
  }
  if (!timezone || !isValidTimezone(timezone)) {
    throw new Error('Timezone must be a valid IANA timezone');
  }

  await db
    .update(users)
    .set({
      displayName,
      bio: bio.length > 0 ? bio : null,
      timezone,
      updatedAt: sql`(CURRENT_TIMESTAMP)`,
    })
    .where(eq(users.id, userId));

  return getFullProfile(db, userId);
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
