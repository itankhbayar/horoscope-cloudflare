import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name').notNull(),
    displayName: text('display_name'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    timezone: text('timezone'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    isPremium: integer('is_premium', { mode: 'boolean' }).notNull().default(false),
    tokenVersion: integer('token_version').notNull().default(0),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    streakCount: integer('streak_count').notNull().default(0),
    streakLastDate: text('streak_last_date'),
    longestStreakCount: integer('longest_streak_count').notNull().default(0),
    streakFreezes: integer('streak_freezes').notNull().default(0),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
    stripeCustomerIdx: index('users_stripe_customer_id_idx').on(t.stripeCustomerId),
    stripeSubscriptionIdx: index('users_stripe_subscription_id_idx').on(t.stripeSubscriptionId),
    premiumIdx: index('users_is_premium_idx').on(t.isPremium),
  }),
);

export const refreshSessions = sqliteTable(
  'refresh_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    familyId: text('family_id').notNull(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    revokedAt: text('revoked_at'),
    replacedBy: text('replaced_by'),
    lastUsedAt: text('last_used_at'),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex('refresh_sessions_token_hash_idx').on(t.tokenHash),
    userIdx: index('refresh_sessions_user_idx').on(t.userId),
    familyIdx: index('refresh_sessions_family_idx').on(t.familyId),
    expiresAtIdx: index('refresh_sessions_expires_at_idx').on(t.expiresAt),
  }),
);

export const stripeWebhookEvents = sqliteTable(
  'stripe_webhook_events',
  {
    eventId: text('event_id').primaryKey(),
    eventType: text('event_type').notNull(),
    claimedAt: text('claimed_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    processedAt: text('processed_at'),
    status: text('status').notNull().default('processing'),
    error: text('error'),
  },
  (t) => ({
    statusClaimedIdx: index('stripe_webhook_events_status_claimed_idx').on(t.status, t.claimedAt),
    processedAtIdx: index('stripe_webhook_events_processed_at_idx').on(t.processedAt),
  }),
);

export const birthProfiles = sqliteTable(
  'birth_profiles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    birthDate: text('birth_date').notNull(),
    birthTime: text('birth_time'),
    birthCity: text('birth_city').notNull(),
    birthCountry: text('birth_country'),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    timezoneOffset: real('timezone_offset').notNull().default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    userIdx: uniqueIndex('birth_profiles_user_idx').on(t.userId),
  }),
);

export const natalCharts = sqliteTable(
  'natal_charts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sunSign: text('sun_sign').notNull(),
    moonSign: text('moon_sign').notNull(),
    risingSign: text('rising_sign'),
    planets: text('planets', { mode: 'json' }).notNull(),
    houses: text('houses', { mode: 'json' }).notNull(),
    aspects: text('aspects', { mode: 'json' }).notNull(),
    computedAt: text('computed_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    userIdx: uniqueIndex('natal_charts_user_idx').on(t.userId),
  }),
);

export const dailyHoroscopes = sqliteTable(
  'daily_horoscopes',
  {
    id: text('id').primaryKey(),
    sign: text('sign').notNull(),
    date: text('date').notNull(),
    lang: text('lang').notNull().default('en'),
    overall: text('overall').notNull(),
    love: text('love').notNull(),
    career: text('career').notNull(),
    health: text('health').notNull(),
    luckyNumber: integer('lucky_number').notNull(),
    luckyColor: text('lucky_color').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    signDateLangIdx: uniqueIndex('daily_horoscopes_sign_date_lang_idx').on(t.sign, t.date, t.lang),
    dateIdx: index('daily_horoscopes_date_idx').on(t.date),
  }),
);

export const dailyRitualHistory = sqliteTable(
  'daily_ritual_history',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ritualDate: text('ritual_date').notNull(),
    completedAt: text('completed_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    userDateIdx: uniqueIndex('daily_ritual_history_user_date_idx').on(t.userId, t.ritualDate),
    userDateLookupIdx: index('daily_ritual_history_user_date_lookup_idx').on(t.userId, t.ritualDate),
  }),
);

export const compatibilityResults = sqliteTable(
  'compatibility_results',
  {
    id: text('id').primaryKey(),
    sign1: text('sign_1').notNull(),
    sign2: text('sign_2').notNull(),
    user1Id: text('user_1_id').references(() => users.id, { onDelete: 'set null' }),
    user2Id: text('user_2_id').references(() => users.id, { onDelete: 'set null' }),
    overallScore: integer('overall_score').notNull(),
    loveScore: integer('love_score').notNull(),
    friendshipScore: integer('friendship_score').notNull(),
    communicationScore: integer('communication_score').notNull(),
    summary: text('summary').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    pairIdx: index('compatibility_pair_idx').on(t.sign1, t.sign2),
  }),
);

export const tarotDaily = sqliteTable(
  'tarot_daily',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    timezone: text('timezone').notNull(),
    sign: text('sign').notNull(),
    payloadJson: text('payload_json', { mode: 'json' }).notNull(),
    energyScore: integer('energy_score').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    dateTzSignIdx: uniqueIndex('tarot_daily_date_tz_sign_idx').on(t.date, t.timezone, t.sign),
    dateIdx: index('tarot_daily_date_idx').on(t.date),
  }),
);

export const notificationPreferences = sqliteTable('notification_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  allEnabled: integer('all_enabled', { mode: 'boolean' }).notNull().default(false),
  saleAlertsEnabled: integer('sale_alerts_enabled', { mode: 'boolean' }).notNull().default(false),
  horoscopesEnabled: integer('horoscopes_enabled', { mode: 'boolean' }).notNull().default(false),
  transitsEnabled: integer('transits_enabled', { mode: 'boolean' }).notNull().default(false),
  dailyReminderEnabled: integer('daily_reminder_enabled', { mode: 'boolean' }).notNull().default(true),
  streakReminderEnabled: integer('streak_reminder_enabled', { mode: 'boolean' }).notNull().default(true),
  reEngagementEnabled: integer('re_engagement_enabled', { mode: 'boolean' }).notNull().default(true),
  quietHoursEnabled: integer('quiet_hours_enabled', { mode: 'boolean' }).notNull().default(true),
  quietHoursStart: text('quiet_hours_start').notNull().default('21:00'),
  quietHoursEnd: text('quiet_hours_end').notNull().default('08:00'),
  reminderHourLocal: integer('reminder_hour_local').notNull().default(9),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const pushTokens = sqliteTable(
  'push_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expoPushToken: text('expo_push_token').notNull(),
    platform: text('platform').notNull(),
    deviceId: text('device_id'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    lastSeenAt: text('last_seen_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    expoPushTokenIdx: uniqueIndex('push_tokens_expo_push_token_idx').on(t.expoPushToken),
    userIdIdx: index('push_tokens_user_id_idx').on(t.userId),
    enabledIdx: index('push_tokens_enabled_idx').on(t.enabled),
  }),
);

export const notificationJobs = sqliteTable(
  'notification_jobs',
  {
    id: text('id').primaryKey(),
    dedupeKey: text('dedupe_key').notNull(),
    kind: text('kind').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    localDate: text('local_date').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: text('data'),
    status: text('status').notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    scheduledFor: text('scheduled_for').notNull(),
    lastError: text('last_error'),
    receipts: text('receipts'),
    receiptsCheckedAt: text('receipts_checked_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    sentAt: text('sent_at'),
  },
  (t) => ({
    dedupeKeyIdx: uniqueIndex('notification_jobs_dedupe_key_idx').on(t.dedupeKey),
    statusScheduledIdx: index('notification_jobs_status_scheduled_idx').on(t.status, t.scheduledFor),
    userIdx: index('notification_jobs_user_idx').on(t.userId),
    receiptsPendingIdx: index('notification_jobs_receipts_pending_idx').on(t.status, t.receiptsCheckedAt),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshSession = typeof refreshSessions.$inferSelect;
export type NewRefreshSession = typeof refreshSessions.$inferInsert;
export type BirthProfile = typeof birthProfiles.$inferSelect;
export type NewBirthProfile = typeof birthProfiles.$inferInsert;
export type NatalChart = typeof natalCharts.$inferSelect;
export type NewNatalChart = typeof natalCharts.$inferInsert;
export type DailyHoroscope = typeof dailyHoroscopes.$inferSelect;
export type NewDailyHoroscope = typeof dailyHoroscopes.$inferInsert;
export type DailyRitualHistory = typeof dailyRitualHistory.$inferSelect;
export type NewDailyRitualHistory = typeof dailyRitualHistory.$inferInsert;
export type CompatibilityResult = typeof compatibilityResults.$inferSelect;
export type NewCompatibilityResult = typeof compatibilityResults.$inferInsert;
export type TarotDaily = typeof tarotDaily.$inferSelect;
export type NewTarotDaily = typeof tarotDaily.$inferInsert;
export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type NewStripeWebhookEvent = typeof stripeWebhookEvents.$inferInsert;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferences = typeof notificationPreferences.$inferInsert;
export type PushToken = typeof pushTokens.$inferSelect;
export type NewPushToken = typeof pushTokens.$inferInsert;
export type NotificationJob = typeof notificationJobs.$inferSelect;
export type NewNotificationJob = typeof notificationJobs.$inferInsert;
