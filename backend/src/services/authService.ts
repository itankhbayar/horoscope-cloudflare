import { sign as signJwt, verify as verifyJwt } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { users, birthProfiles, natalCharts, type User } from '../db/schema';
import { hashPassword, verifyPassword } from '../utils/password';
import { lookupCity } from '../utils/cities';
import { computeNatalChart } from './astrologyService';

export interface RegisterInput {
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
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  exp: number;
  [key: string]: unknown;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function newId(): string {
  return crypto.randomUUID();
}

export async function registerUser(
  db: DB,
  jwtSecret: string,
  input: RegisterInput,
): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password || !input.fullName || !input.birthDate || !input.birthCity) {
    throw new HttpError(400, 'Missing required fields');
  }
  if (input.password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) throw new HttpError(409, 'Email already registered');

  let lat = input.latitude ?? null;
  let lon = input.longitude ?? null;
  let tz = input.timezoneOffset ?? null;
  let country = input.birthCountry ?? null;

  if (lat === null || lon === null) {
    const city = lookupCity(input.birthCity);
    if (!city) {
      throw new HttpError(
        400,
        'Birth city not recognized. Please choose from suggestions or provide coordinates.',
      );
    }
    lat = city.latitude;
    lon = city.longitude;
    tz = city.timezoneOffset;
    country = country ?? city.country;
  }
  if (tz === null) tz = 0;

  const userId = newId();
  const passwordHash = await hashPassword(input.password);

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    fullName: input.fullName.trim(),
  });

  await db.insert(birthProfiles).values({
    id: newId(),
    userId,
    birthDate: input.birthDate,
    birthTime: input.birthTime ?? null,
    birthCity: input.birthCity.trim(),
    birthCountry: country,
    latitude: lat,
    longitude: lon,
    timezoneOffset: tz,
  });

  const chart = computeNatalChart({
    birthDate: input.birthDate,
    birthTime: input.birthTime ?? null,
    latitude: lat,
    longitude: lon,
    timezoneOffset: tz,
  });

  await db.insert(natalCharts).values({
    id: newId(),
    userId,
    sunSign: chart.sunSign,
    moonSign: chart.moonSign,
    risingSign: chart.risingSign,
    planets: chart.planets,
    houses: chart.houses,
    aspects: chart.aspects,
  });

  const token = await issueToken(jwtSecret, userId, email);
  return {
    token,
    user: { id: userId, email, fullName: input.fullName.trim() },
  };
}

export async function loginUser(
  db: DB,
  jwtSecret: string,
  input: LoginInput,
): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user) throw new HttpError(401, 'Invalid email or password');
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid email or password');
  const token = await issueToken(jwtSecret, user.id, user.email);
  return {
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName },
  };
}

export async function issueToken(secret: string, userId: string, email: string): Promise<string> {
  const payload: AuthTokenPayload = {
    userId,
    email,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  return signJwt(payload, secret);
}

export async function verifyToken(secret: string, token: string): Promise<AuthTokenPayload> {
  const decoded = (await verifyJwt(token, secret, 'HS256')) as unknown as AuthTokenPayload;
  return decoded;
}

export async function getUserById(db: DB, userId: string): Promise<User | null> {
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  return user ?? null;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
