import { eq, or } from 'drizzle-orm';
import type { DB } from '../db/client';
import {
  birthProfiles,
  compatibilityResults,
  natalCharts,
  notificationPreferences,
  pushTokens,
  users,
} from '../db/schema';
import { getFullProfile } from './profileService';

const AVATAR_PREFIX = 'profile/';
const AVATAR_EXTS = ['jpg', 'jpeg', 'png', 'webp'] as const;

function extractAvatarKey(avatarUrl: string): string | null {
  const normalized = avatarUrl.trim();
  if (normalized.length === 0) return null;

  try {
    const parsed = new URL(normalized);
    const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    return key.length > 0 ? key : null;
  } catch {
    const fallback = normalized.replace(/^\/+/, '');
    return fallback.length > 0 ? fallback : null;
  }
}

async function deleteAvatarObjectIfPresent(
  storage: R2Bucket | undefined,
  userId: string,
  avatarUrl: string | null,
): Promise<void> {
  if (!storage) return;

  const explicitKey = avatarUrl ? extractAvatarKey(avatarUrl) : null;
  if (explicitKey && explicitKey.startsWith(AVATAR_PREFIX)) {
    await storage.delete(explicitKey);
    return;
  }

  await Promise.all(
    AVATAR_EXTS.map((ext) => storage.delete(`${AVATAR_PREFIX}${userId}.${ext}`)),
  );
}

export async function deleteAccount(db: DB, userId: string, storage?: R2Bucket): Promise<void> {
  const existing = await db
    .select({ id: users.id, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!existing) {
    throw new Error('User not found');
  }

  await deleteAvatarObjectIfPresent(storage, userId, existing.avatarUrl ?? null);

  await db
    .update(compatibilityResults)
    .set({ user1Id: null, user2Id: null })
    .where(or(eq(compatibilityResults.user1Id, userId), eq(compatibilityResults.user2Id, userId)));

  await db
    .delete(pushTokens)
    .where(eq(pushTokens.userId, userId));

  await db
    .delete(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  await db
    .delete(natalCharts)
    .where(eq(natalCharts.userId, userId));

  await db
    .delete(birthProfiles)
    .where(eq(birthProfiles.userId, userId));

  await db
    .delete(users)
    .where(eq(users.id, userId));
}

export async function exportAccountData(db: DB, userId: string): Promise<Record<string, unknown>> {
  const profile = await getFullProfile(db, userId);
  const preferences = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .get();
  const user = await db
    .select({
      id: users.id,
      isPremium: users.isPremium,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  return {
    exportedAt: new Date().toISOString(),
    profile: profile.user,
    birthProfile: profile.birthProfile,
    natalChart: profile.natalChart,
    subscription: user
      ? {
          isPremium: Boolean(user.isPremium),
          stripeCustomerId: user.stripeCustomerId,
          stripeSubscriptionId: user.stripeSubscriptionId,
        }
      : null,
    preferences: {
      notifications: preferences ?? null,
    },
    retentionNotice:
      'Account deletion removes account, birth profile, natal chart, notification preferences, and push tokens. Payment processors may retain billing records under their own legal obligations.',
  };
}
