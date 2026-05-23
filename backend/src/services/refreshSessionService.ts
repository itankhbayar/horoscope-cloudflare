import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { refreshSessions, users, type RefreshSession, type User } from '../db/schema';
import { issueAccessToken } from './authService';

const REFRESH_TOKEN_BYTES = 32;
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export class RefreshSessionError extends Error {
  constructor(
    public code:
      | 'missing'
      | 'invalid'
      | 'expired'
      | 'revoked'
      | 'reused'
      | 'user_not_found'
      | 'race_lost',
    message: string,
  ) {
    super(message);
    this.name = 'RefreshSessionError';
  }
}

type SessionContext = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type IssuedSession = {
  accessToken: string;
  refreshToken: string;
  refreshSession: RefreshSession;
  user: {
    id: string;
    email: string;
    fullName: string;
    isPremium: boolean;
  };
};

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function newRefreshToken(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(REFRESH_TOKEN_BYTES)));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashRefreshToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

function expiresAtFrom(now = new Date()): string {
  return new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();
}

function toUserDto(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isPremium: Boolean(user.isPremium),
  };
}

async function insertRefreshSession(
  db: DB,
  input: {
    userId: string;
    tokenHash: string;
    familyId: string;
    context: SessionContext;
  },
): Promise<RefreshSession> {
  const row = {
    id: crypto.randomUUID(),
    userId: input.userId,
    tokenHash: input.tokenHash,
    familyId: input.familyId,
    expiresAt: expiresAtFrom(),
    userAgent: input.context.userAgent ?? null,
    ipAddress: input.context.ipAddress ?? null,
  };
  await db.insert(refreshSessions).values(row);
  const inserted = await db
    .select()
    .from(refreshSessions)
    .where(eq(refreshSessions.id, row.id))
    .get();
  if (!inserted) throw new RefreshSessionError('invalid', 'Could not create refresh session');
  return inserted;
}

export async function createRefreshSessionForUser(
  db: DB,
  jwtSecret: string,
  user: User,
  context: SessionContext,
): Promise<IssuedSession> {
  const refreshToken = newRefreshToken();
  const tokenHash = await hashRefreshToken(refreshToken);
  const refreshSession = await insertRefreshSession(db, {
    userId: user.id,
    tokenHash,
    familyId: crypto.randomUUID(),
    context,
  });
  const accessToken = await issueAccessToken(jwtSecret, user.id, user.email, user.tokenVersion);
  return { accessToken, refreshToken, refreshSession, user: toUserDto(user) };
}

export async function createRefreshSessionForAuthResult(
  db: DB,
  jwtSecret: string,
  userId: string,
  context: SessionContext,
): Promise<IssuedSession> {
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new RefreshSessionError('user_not_found', 'User not found');
  return createRefreshSessionForUser(db, jwtSecret, user, context);
}

async function revokeRefreshFamily(db: DB, familyId: string): Promise<void> {
  await db
    .update(refreshSessions)
    .set({ revokedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(and(eq(refreshSessions.familyId, familyId), isNull(refreshSessions.revokedAt)));
}

export async function revokeAllUserRefreshSessions(db: DB, userId: string): Promise<void> {
  await db
    .update(refreshSessions)
    .set({ revokedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(and(eq(refreshSessions.userId, userId), isNull(refreshSessions.revokedAt)));
}

export async function incrementUserTokenVersion(db: DB, userId: string): Promise<void> {
  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(eq(users.id, userId));
}

export async function revokeCurrentRefreshSession(db: DB, refreshToken: string): Promise<void> {
  const tokenHash = await hashRefreshToken(refreshToken);
  await db
    .update(refreshSessions)
    .set({ revokedAt: sql`(CURRENT_TIMESTAMP)`, lastUsedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(and(eq(refreshSessions.tokenHash, tokenHash), isNull(refreshSessions.revokedAt)));
}

export async function rotateRefreshSession(
  db: DB,
  jwtSecret: string,
  refreshToken: string,
  context: SessionContext,
): Promise<IssuedSession> {
  if (!refreshToken.trim()) throw new RefreshSessionError('missing', 'refreshToken is required');
  const tokenHash = await hashRefreshToken(refreshToken);
  const existing = await db
    .select()
    .from(refreshSessions)
    .where(eq(refreshSessions.tokenHash, tokenHash))
    .get();

  if (!existing) throw new RefreshSessionError('invalid', 'Invalid refresh token');

  if (existing.revokedAt) {
    await revokeRefreshFamily(db, existing.familyId);
    await incrementUserTokenVersion(db, existing.userId);
    throw new RefreshSessionError('reused', 'Refresh token reuse detected');
  }

  if (Date.parse(existing.expiresAt) <= Date.now()) {
    await db
      .update(refreshSessions)
      .set({ revokedAt: sql`(CURRENT_TIMESTAMP)`, lastUsedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(refreshSessions.id, existing.id));
    throw new RefreshSessionError('expired', 'Refresh token expired');
  }

  const user = await db.select().from(users).where(eq(users.id, existing.userId)).get();
  if (!user) {
    await revokeRefreshFamily(db, existing.familyId);
    throw new RefreshSessionError('user_not_found', 'User not found');
  }

  const nextRefreshToken = newRefreshToken();
  const nextHash = await hashRefreshToken(nextRefreshToken);
  const nextSession = await insertRefreshSession(db, {
    userId: existing.userId,
    tokenHash: nextHash,
    familyId: existing.familyId,
    context,
  });

  const updateResult = await db.run(sql`
    UPDATE refresh_sessions
    SET revoked_at = CURRENT_TIMESTAMP,
        replaced_by = ${nextSession.id},
        last_used_at = CURRENT_TIMESTAMP
    WHERE id = ${existing.id}
      AND revoked_at IS NULL
  `);

  const changes = Number((updateResult as { meta?: { changes?: number } }).meta?.changes ?? 1);
  if (changes !== 1) {
    await revokeRefreshFamily(db, existing.familyId);
    await incrementUserTokenVersion(db, existing.userId);
    throw new RefreshSessionError('race_lost', 'Refresh token was already used');
  }

  const accessToken = await issueAccessToken(jwtSecret, user.id, user.email, user.tokenVersion);
  return {
    accessToken,
    refreshToken: nextRefreshToken,
    refreshSession: nextSession,
    user: toUserDto(user),
  };
}
