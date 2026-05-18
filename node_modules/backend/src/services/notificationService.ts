import { and, eq, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { notificationPreferences, pushTokens } from '../db/schema';

type NotificationPreferencesDto = {
  allEnabled: boolean;
  saleAlertsEnabled: boolean;
  horoscopesEnabled: boolean;
  transitsEnabled: boolean;
};

type NotificationPreferencesUpdatePayload = {
  allEnabled?: boolean;
  saleAlertsEnabled?: boolean;
  horoscopesEnabled?: boolean;
  transitsEnabled?: boolean;
};

type PushTokenPlatform = 'ios' | 'android' | 'web' | 'unknown';

type PushTokenRegistrationPayload = {
  expoPushToken: string;
  platform: PushTokenPlatform;
  deviceId?: string | null;
};

const ALLOWED_PLATFORMS = new Set<PushTokenPlatform>(['ios', 'android', 'web', 'unknown']);

function normalizePreferencesRow(
  row: typeof notificationPreferences.$inferSelect | null | undefined,
): NotificationPreferencesDto {
  return {
    allEnabled: Boolean(row?.allEnabled),
    saleAlertsEnabled: Boolean(row?.saleAlertsEnabled),
    horoscopesEnabled: Boolean(row?.horoscopesEnabled),
    transitsEnabled: Boolean(row?.transitsEnabled),
  };
}

function assertBooleanField(
  payload: Record<string, unknown>,
  key: keyof NotificationPreferencesUpdatePayload,
): boolean | undefined {
  const value = payload[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new Error(`${key} must be a boolean`);
  }
  return value;
}

function isValidExpoPushToken(value: string): boolean {
  if (value.length < 12 || value.length > 512) return false;
  return /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(value);
}

function assertPlatform(value: unknown): PushTokenPlatform {
  if (typeof value !== 'string') throw new Error('platform is required');
  if (!ALLOWED_PLATFORMS.has(value as PushTokenPlatform)) {
    throw new Error('platform must be one of ios, android, web, unknown');
  }
  return value as PushTokenPlatform;
}

export async function getNotificationPreferences(db: DB, userId: string): Promise<NotificationPreferencesDto> {
  const existing = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, userId),
  });
  if (!existing) {
    await db
      .insert(notificationPreferences)
      .values({
        userId,
      })
      .onConflictDoNothing();
  }
  const row =
    existing ??
    (await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    }));
  return normalizePreferencesRow(row);
}

export async function updateNotificationPreferences(
  db: DB,
  userId: string,
  payload: NotificationPreferencesUpdatePayload,
): Promise<NotificationPreferencesDto> {
  const raw = payload as Record<string, unknown>;
  const patch: NotificationPreferencesUpdatePayload = {
    allEnabled: assertBooleanField(raw, 'allEnabled'),
    saleAlertsEnabled: assertBooleanField(raw, 'saleAlertsEnabled'),
    horoscopesEnabled: assertBooleanField(raw, 'horoscopesEnabled'),
    transitsEnabled: assertBooleanField(raw, 'transitsEnabled'),
  };
  const current = await getNotificationPreferences(db, userId);
  const next: NotificationPreferencesDto = {
    allEnabled: patch.allEnabled ?? current.allEnabled,
    saleAlertsEnabled: patch.saleAlertsEnabled ?? current.saleAlertsEnabled,
    horoscopesEnabled: patch.horoscopesEnabled ?? current.horoscopesEnabled,
    transitsEnabled: patch.transitsEnabled ?? current.transitsEnabled,
  };

  await db
    .insert(notificationPreferences)
    .values({
      userId,
      allEnabled: next.allEnabled,
      saleAlertsEnabled: next.saleAlertsEnabled,
      horoscopesEnabled: next.horoscopesEnabled,
      transitsEnabled: next.transitsEnabled,
      updatedAt: sql`(CURRENT_TIMESTAMP)`,
    })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: {
        allEnabled: next.allEnabled,
        saleAlertsEnabled: next.saleAlertsEnabled,
        horoscopesEnabled: next.horoscopesEnabled,
        transitsEnabled: next.transitsEnabled,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
      },
    });

  return next;
}

export async function registerPushToken(
  db: DB,
  userId: string,
  payload: PushTokenRegistrationPayload,
): Promise<void> {
  const token = (payload.expoPushToken ?? '').trim();
  if (!token) throw new Error('expoPushToken is required');
  if (!isValidExpoPushToken(token)) throw new Error('expoPushToken format is invalid');
  const platform = assertPlatform(payload.platform);
  const deviceId =
    typeof payload.deviceId === 'string' && payload.deviceId.trim().length > 0 ? payload.deviceId.trim() : null;

  await db
    .insert(pushTokens)
    .values({
      id: crypto.randomUUID(),
      userId,
      expoPushToken: token,
      platform,
      deviceId,
      enabled: true,
      updatedAt: sql`(CURRENT_TIMESTAMP)`,
      lastSeenAt: sql`(CURRENT_TIMESTAMP)`,
    })
    .onConflictDoUpdate({
      target: pushTokens.expoPushToken,
      set: {
        userId,
        platform,
        deviceId,
        enabled: true,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        lastSeenAt: sql`(CURRENT_TIMESTAMP)`,
      },
    });
}

export async function disablePushToken(db: DB, userId: string, expoPushToken: string): Promise<void> {
  const token = expoPushToken.trim();
  if (!token) throw new Error('expoPushToken is required');
  await db
    .update(pushTokens)
    .set({
      enabled: false,
      updatedAt: sql`(CURRENT_TIMESTAMP)`,
    })
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.expoPushToken, token)));
}

