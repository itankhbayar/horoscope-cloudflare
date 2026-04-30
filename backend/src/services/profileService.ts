import { eq } from 'drizzle-orm';
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
