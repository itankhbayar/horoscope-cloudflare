import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RitualAnalyticsSource =
  | 'home'
  | 'guest_preview'
  | 'premium_screen'
  | 'profile_card'
  | 'post_reading'
  | 'onboarding_teaser'
  | 'saved_reflection'
  | 'rhythm_insight'
  | 'relationship_atmosphere'
  | 'natal_resonance'
  | 'private_archive'
  | 'ritual_history'
  | 'settings';

export const ANALYTICS_SCHEMA_VERSION = 2;

export type AnalyticsEmissionMode = 'canonical' | 'legacy_alias';

export type AnalyticsMigrationMetadata = {
  analyticsSchemaVersion?: number;
  ritualEventMigration?: boolean;
  legacyEventAlias?: string;
  canonicalEventName?: string;
  emissionMode?: AnalyticsEmissionMode;
};

export type RitualAnalyticsPayload = {
  source: RitualAnalyticsSource;
  momentType?: string;
  premiumState?: 'free' | 'premium' | 'unknown';
  trigger?: string;
  readingType?: string;
  continuationType?: string;
  userMode?: 'guest' | 'authenticated' | 'unknown';
  experimentVariant?: string;
  moment?: string;
} & AnalyticsMigrationMetadata;

type LegacyPaywallProperties = {
  source:
    | 'premium_screen'
    | 'locked_preview'
    | 'profile_card'
    | 'post_reading'
    | 'onboarding_teaser'
    | 'saved_reflection'
    | 'rhythm_insight'
    | 'relationship_atmosphere'
    | 'natal_resonance';
} & AnalyticsMigrationMetadata;

type LegacyLockedContentProperties = {
  surface: 'horoscope_period' | 'home_module';
  period?: 'yesterday' | 'tomorrow' | 'weekly' | 'monthly' | 'annual';
} & AnalyticsMigrationMetadata;

type LegacyReadingRevealedProperties = {
  surface: 'tarot' | 'crystal' | 'transit' | 'moon' | 'affirmation';
} & AnalyticsMigrationMetadata;

type CompatibilityAnalyticsDimensions = {
  locale?: 'en' | 'mn';
  pair_key?: string;
  score_band?: 'below_55' | '55_69' | '70_84' | '85_plus';
  shared_score?: number;
  share_ref?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
};

type CompatibilityShareAnalyticsPayload = {
  surface: 'compatibility';
  sign1: string;
  sign2: string;
  score: number;
} & CompatibilityAnalyticsDimensions;

type CompatibilityLandingAnalyticsPayload = {
  sign1: string;
  sign2: string;
  source: 'share_card' | 'unknown';
  shared_score: number;
  url_score: number | null;
} & CompatibilityAnalyticsDimensions;

export type AnalyticsEventMap = {
  app_open: { source?: 'cold_start' | 'resume' };
  daily_active: { date: string; hasBirthProfile: boolean; isPremium: boolean };
  onboarding_started: { hasBirthProfile?: boolean; surface?: 'register' | 'post_register'; step?: string };
  onboarding_completed: { hasBirthProfile: boolean };
  onboarding_hook_shown: { source: 'onboarding'; sign: string; element: string; variant: number };
  onboarding_hook_continue: { source: 'onboarding'; sign: string; element: string; variant: number };
  first_horoscope_revealed: { sign?: string; platform: string; days_since_signup?: number };
  birth_data_completed: { hasBirthTime: boolean; cityCountry?: string };
  first_value_shown: { surface: 'register'; valueType: 'personal_sky_preview'; hasBirthTime: boolean };
  account_creation_prompt_shown: { surface: 'register'; valueType: 'personal_sky_preview' };
  account_created_after_value: { method: 'email' | 'google' | 'apple'; hasBirthProfile: boolean };
  onboarding_abandoned: { surface: 'register'; step: string; hasSeenValue: boolean };
  preview_viewed: { surface: 'register'; sign: string; hasBirthTime: boolean };
  preview_cta_clicked: { surface: 'register'; cta: 'save_reading' };
  preview_birth_time_added: { surface: 'register' };
  preview_account_created: { method: 'email' | 'google' | 'apple'; hasBirthProfile: boolean };
  first_reading_viewed: { source: 'guest' | 'authenticated'; sign: string; date: string };
  onboarding_step_completed: { step: string; guest: boolean };
  guest_to_signup_conversion: { stage: string };
  emotional_feed_engaged: { source: 'guest' | 'authenticated'; depth: number };
  guest_session_depth: { depth: number; stage: string };
  personalized_preview_completed: { method: 'birth_date' | 'zodiac_sign' };
  resonance_personalization_completed: { method: 'birth_date' | 'zodiac_sign'; sign: string; resonanceScore: number };
  nightly_ritual_return: { date: string; source: 'guest' | 'authenticated' };
  emotional_feed_dwell: { source: 'guest' | 'authenticated'; seconds: number };
  push_open_quality: { reason: 'tension' | 'intimacy' | 'clarity' | 'reflection' | 'socialOpenness'; openedWithinMinutes?: number };
  reflection_prompt_engaged: { source: 'guest' | 'authenticated'; promptId: string };
  quiet_hour_usage: { source: 'guest' | 'authenticated'; enabled: boolean };
  emotional_weather_interaction: { source: 'guest' | 'authenticated'; signal: string };
  ritual_habit_formation: { source: 'guest' | 'authenticated'; nights: number };
  premium_conversion_after_resonance: { sign: string; resonanceScore: number };
  premium_paywall_triggered: LegacyPaywallProperties;
  private_archive_view_depth: { archiveCount: number; ritualNights: number };
  emotional_continuity_engaged: { ritualNights: number; strongestSignal?: string };
  natal_resonance_upgrade_tapped: { missingBirthTime: boolean; missingBirthplace: boolean };
  birth_time_unlock_prompt_conversion: { source: 'premium_archive' | 'natal_resonance' };
  private_archive_retention: { archiveCount: number; ritualNights: number };
  premium_cancellation_risk_signal: { reason: 'pricing_viewed_no_purchase' | 'restore_failed' | 'manage_opened' | 'privacy_concern' };
  ritual_session_duration: { seconds: number; mode: 'ambient' | 'standard' };
  calm_reading_engagement: { theme: string; fatigueRisk: 'low' | 'medium' | 'high' };
  ambient_mode_usage: { enabled: boolean; theme: string };
  atmosphere_theme_preference: { theme: string; source: 'auto' | 'manual' };
  reduced_motion_usage: { enabled: boolean };
  sensory_feature_opt_in: { feature: 'haptics' | 'soundscape' | 'voice_reading'; enabled: boolean };
  soundscape_engagement: { soundscape: string; action: 'preview' | 'start' | 'stop' };
  nighttime_return_behavior: { date: string; mode: 'ambient' | 'standard' };
  emotional_continuity_retention: { ritualNights: number };
  ritual_history_engaged: { ritualNights: number; archiveCount: number };
  archive_revisit: { archiveCount: number };
  reflection_save_rate: { archiveCount: number };
  tone_fatigue_signal: { surface: 'guest_ritual' | 'home' | 'push'; reason: 'repetitive' | 'too_intense' | 'too_vague' };
  variation_engine_performance: { surface: 'personal_sky'; variant: string };
  emotional_memory_opt_in: { source: 'guest_ritual' | 'settings' };
  emotional_memory_reset: { source: 'guest_ritual' | 'settings' };
  signup_timing_conversion: {
    timing: 'after_global_sky' | 'after_preview' | 'after_share' | 'after_personalization';
  };
  birth_city_abandonment: { source: 'register' | 'guest_personalization' };
  delayed_birth_time_completed: { source: 'post_reading' | 'streak_milestone' | 'premium_teaser' };
  streak_activation_after_guest: { streakCount: number };
  experiment_exposure: { experiment: string; variant: string };
  birth_time_abandonment: { source: 'register' | 'guest_personalization' };
  share_interaction: { source: 'guest_preview' | 'home'; sign: string; date: string };
  activation_completion: { source: 'guest' | 'authenticated'; hasBirthProfile: boolean };
  signup_started: { step?: string; signup_source?: string | null; share_ref?: string | null };
  signup_completed: { hasBirthProfile: boolean; signup_source?: string | null; share_ref?: string | null };
  paywall_viewed: LegacyPaywallProperties;
  checkout_started: { plan?: 'monthly' | 'yearly'; provider: 'revenuecat' | 'stripe' };
  premium_purchased: { provider: 'revenuecat' | 'stripe'; source: 'purchase_sync' | 'restore_sync' };
  /** User tapped the paywall CTA. Distinct from `trial_started` (store-confirmed trial). */
  trial_cta_clicked: { provider: 'revenuecat' | 'stripe'; plan?: 'monthly' | 'yearly'; hasTrial: boolean };
  /**
   * BACKEND_OWNED — documented here for payload shape only; the client must NOT emit it.
   * `trial_started` is emitted server-side by the RevenueCat and Stripe webhooks (single
   * authoritative source). It is excluded from `ClientEmittableEvent`, so `track('trial_started', …)`
   * will not compile. See docs/analytics-event-ownership.md.
   */
  trial_started: { provider: 'revenuecat'; plan?: 'monthly' | 'yearly'; source: 'purchase_confirmation' };
  subscription_restored: { provider: 'revenuecat' | 'stripe'; active: boolean };
  notification_settings_viewed: { canRequestPush: boolean };
  notification_opt_in_started: { source: 'settings' };
  notification_opt_in_completed: { source: 'settings' };
  notification_opt_in_failed: { reason: 'permission_denied' | 'unavailable' | 'network' | 'unknown' };
  notification_opt_out: { source: 'settings' };
  notification_permission_prompt_shown: { source: 'settings' };
  notification_permission_accepted: { source: 'settings' };
  notification_permission_denied: { source: 'settings' };
  reminder_scheduled: { type: 'atmospheric_ritual'; fireDateISO: string; silent: boolean };
  reminder_schedule_failed: { type: 'atmospheric_ritual'; reason: string };
  reminder_delivered: { type: 'atmospheric_ritual'; reason?: string };
  reminder_opened: { type: 'atmospheric_ritual'; reason?: string };
  delivery_state_viewed: { scheduled: boolean; permissionStatus: string; paused: boolean };
  quiet_hour_adjustment_applied: { desiredHHMM: string; scheduledHHMM: string };
  duplicate_reminder_cleanup: { count: number };
  stale_reminder_recovery: { recovered: boolean };
  disabled_state_impression: { reason: 'permission_denied' | 'unavailable' | 'disabled' | 'paused' };
  system_settings_cta_tapped: { source: 'notification_settings' };
  quiet_hour_preference_saved: { start: string; end: string; enabled: boolean };
  silent_mode_enabled: { enabled: boolean };
  pause_reminders_used: { days: number; pausedUntilISO: string };
  reminder_resume: { source: 'settings' };
  notification_personalization_reset: { source: 'settings' };
  notification_driven_ritual_completion: { date: string };
  notification_fatigue_signal: { reason: 'too_frequent' | 'too_personal' | 'bad_timing' | 'too_generic' };
  settings_abandonment: { surface: 'notifications'; reason: 'left_without_action' | 'advanced_open_no_change' };
  ritual_preset_adopted: { preset: string };
  advanced_control_used: { surface: 'notifications'; control: string };
  ritual_flow_completion: { surface: 'notifications' | 'guest_ritual'; preset?: string };
  cognitive_overload_signal: { surface: 'notifications' | 'premium' | 'guest_ritual'; reason: 'advanced_opened' | 'rapid_toggle' | 'back_without_schedule' };
  notification_settings_confusion: { reason: 'system_settings_opened' | 'schedule_failed' | 'advanced_opened' };
  calm_mode_retention: { preset: string; source: 'settings' };
  screen_emotional_overload_signal: { screen: string; reason: 'too_many_actions' | 'dense_text' | 'competing_moments' };
  interaction_density_friction: { screen: string; visibleActions: number };
  text_expansion_used: { screen: string; moment: string };
  hidden_control_discovered: { screen: string; control: string };
  emotional_pacing_engagement: { screen: string; moment: string; rhythm: string };
  atmosphere_first_navigation_success: { from: string; to: string; moment: string };
  home_sequence_started: { dominantSignal: string };
  home_sequence_completed: { finalMoment: string };
  home_sequence_dropoff: { moment: string };
  home_moment_skipped: { moment: string };
  reflection_continuation_tapped: { source: 'home'; moment: string };
  deeper_layer_tapped: RitualAnalyticsPayload;
  premium_continuation_viewed: RitualAnalyticsPayload;
  premium_continuation_tapped: RitualAnalyticsPayload;
  expanded_reading_requested: RitualAnalyticsPayload;
  ritual_moment_continued: RitualAnalyticsPayload;
  private_archive_prompt_viewed: RitualAnalyticsPayload;
  horoscope_viewed: {
    source: 'home';
    period: 'yesterday' | 'today' | 'tomorrow' | 'weekly' | 'monthly' | 'annual';
    isPremium: boolean;
  };
  horoscope_share_card_opened: { source: 'home' | 'guest_preview'; sign: string; date: string };
  horoscope_share_card_generated: {
    source: 'home' | 'guest_preview';
    sign: string;
    date: string;
    surface: 'native';
  };
  horoscope_share_card_shared: {
    source: 'home' | 'guest_preview';
    sign: string;
    date: string;
    method: 'native' | 'message_fallback';
  };
  horoscope_share_card_failed: { source: 'home' | 'guest_preview'; sign: string; date: string; reason: string };
  compatibility_viewed: { mode: 'signs' | 'users'; sign1?: string; sign2?: string };
  compatibility_share_card_viewed: CompatibilityShareAnalyticsPayload;
  compatibility_share_cta_clicked: CompatibilityShareAnalyticsPayload;
  compatibility_share_link_created: CompatibilityShareAnalyticsPayload;
  compatibility_share_completed: CompatibilityShareAnalyticsPayload & {
    method: 'native' | 'clipboard' | 'download';
    share_ref: string;
  };
  compatibility_share_cancelled: CompatibilityShareAnalyticsPayload & { share_ref: string };
  compatibility_share_failed: CompatibilityShareAnalyticsPayload & { reason: string; share_ref?: string };
  compatibility_share_landing_viewed: CompatibilityLandingAnalyticsPayload & { share_ref: string | null };
  compatibility_landing_score_displayed: CompatibilityLandingAnalyticsPayload;
  compatibility_landing_sign_selected: CompatibilityLandingAnalyticsPayload & {
    recipient_sign: string;
    compare_with: string;
  };
  compatibility_guest_compare_completed: CompatibilityLandingAnalyticsPayload & {
    recipient_sign: string;
    compare_with: string;
    score: number;
  };
  compatibility_landing_cta_clicked: CompatibilityLandingAnalyticsPayload & {
    cta: string;
    compare_with?: string;
  };
  locked_content_tapped: LegacyLockedContentProperties;
  reading_revealed: LegacyReadingRevealedProperties;
  streak_started: { streakCount: number };
  streak_milestone: { streakCount: number; milestone: number };
  streak_freeze_used: { streakCount: number; freezesRemaining: number };
  streak_freeze_prompt_shown: { source: 'home'; streakCount: number; freezesAvailable: number };
  streak_freeze_prompt_dismissed: { source: 'home'; streakCount: number; freezesAvailable: number };
  streak_lost: { previousStreak?: number };
  streak_status_viewed: {
    source: 'home_launch';
    streakCount: number;
    longestStreakCount: number;
    freezesRemaining: number;
    nextMilestone?: number | null;
    completedToday: boolean;
  };
  daily_ritual_completed: {
    completedDate: string;
    currentStreak: number;
    alreadyCompletedToday: boolean;
    shouldCelebrate: boolean;
    milestone?: number | null;
  };
  daily_reading_reveal_clicked: { source: 'home'; date: string };
  daily_reading_revealed: { source: 'home'; date: string; currentStreak?: number };
  daily_reading_already_revealed: { source: 'home'; date: string; currentStreak?: number };
  streak_completion_celebrated: { streakCount: number; milestone?: number | null; freezeAwarded: boolean };
  streak_milestone_reached: { streakCount: number; milestone: number; freezeAwarded: boolean };
  daily_ritual_completion_replayed_blocked: { completedDate: string; source: 'home' };
  streak_milestone_shared: { milestone: number; source: 'home' | 'profile' };
  pattern_memory_shown: {
    source: 'home';
    theme: string;
    kind: 'recent' | 'multiple';
    daysAgo?: number | null;
  };
  pattern_memory_opened: { source: 'home'; theme: string; kind: 'recent' | 'multiple' };
};

export type AnalyticsEvent = keyof AnalyticsEventMap;

/**
 * OWNERSHIP — single source of truth: `docs/analytics-event-ownership.md`.
 * Events the BACKEND owns and emits server-side (Stripe / RevenueCat webhooks). The mobile client
 * must never emit these or the trial funnel double-counts. `trial_started` deliberately remains in
 * `AnalyticsEventMap` (so its server payload shape stays documented here) but is excluded from the
 * client-emittable set below, so `track('trial_started', …)` is a compile error. Mirror of backend
 * `BACKEND_OWNED_EVENTS`; the backend cross-source test pins all three copies to the same list.
 */
export const BACKEND_OWNED_EVENTS = ['trial_started', 'trial_converted', 'trial_cancelled'] as const;
export type BackendOwnedEvent = (typeof BACKEND_OWNED_EVENTS)[number];

/** Events this client is permitted to emit: everything except backend-owned funnel events. */
export type ClientEmittableEvent = Exclude<AnalyticsEvent, BackendOwnedEvent>;

/** True when `event` is backend-owned and therefore forbidden to the mobile client. */
export function isBackendOwnedEvent(event: string): boolean {
  return (BACKEND_OWNED_EVENTS as readonly string[]).includes(event);
}
export type RitualAnalyticsEvent =
  | 'deeper_layer_tapped'
  | 'premium_continuation_viewed'
  | 'premium_continuation_tapped'
  | 'expanded_reading_requested'
  | 'ritual_moment_continued'
  | 'private_archive_prompt_viewed';

type Primitive = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, Primitive>;
type LegacyPaywallSource = AnalyticsEventMap['paywall_viewed']['source'];
type LegacyReadingSurface = AnalyticsEventMap['reading_revealed']['surface'];
type LegacyHoroscopePeriod = NonNullable<AnalyticsEventMap['locked_content_tapped']['period']>;
type LegacyAnalyticsBridge =
  | { event: 'locked_content_tapped'; properties: AnalyticsEventMap['locked_content_tapped'] }
  | { event: 'paywall_viewed'; properties: AnalyticsEventMap['paywall_viewed'] }
  | { event: 'premium_paywall_triggered'; properties: AnalyticsEventMap['premium_paywall_triggered'] }
  | { event: 'reading_revealed'; properties: AnalyticsEventMap['reading_revealed'] };

const CONSENT_KEY = 'analytics:consent';
const INSTALL_ID_KEY = 'analytics:install-id';
const DAILY_ACTIVE_KEY_PREFIX = 'analytics:daily-active:';
const CANONICAL_RITUAL_EVENTS: readonly RitualAnalyticsEvent[] = [
  'deeper_layer_tapped',
  'premium_continuation_viewed',
  'premium_continuation_tapped',
  'expanded_reading_requested',
  'ritual_moment_continued',
  'private_archive_prompt_viewed',
];
const BRIDGED_LEGACY_EVENTS: readonly AnalyticsEvent[] = [
  'locked_content_tapped',
  'paywall_viewed',
  'premium_paywall_triggered',
  'reading_revealed',
];

let analyticsEnabled = false;
let initialized = false;
let installId: string | null = null;
const warnedDirectLegacyEvents = new Set<string>();

function readEnv(key: string): string {
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  const raw = g.process?.env?.[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

function posthogKey(): string {
  return readEnv('EXPO_PUBLIC_POSTHOG_KEY');
}

function posthogHost(): string {
  return readEnv('EXPO_PUBLIC_POSTHOG_HOST') || 'https://us.i.posthog.com';
}

function randomId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `install-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function getInstallId(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
  if (existing) return existing;
  const next = randomId();
  await AsyncStorage.setItem(INSTALL_ID_KEY, next);
  return next;
}

export function sanitizeAnalyticsProperties(properties: AnalyticsProperties): AnalyticsProperties {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) =>
      value === null || value === undefined || ['string', 'number', 'boolean'].includes(typeof value),
    ),
  );
}

export function normalizeRitualEventName(event: AnalyticsEvent | string): RitualAnalyticsEvent | null {
  if (CANONICAL_RITUAL_EVENTS.includes(event as RitualAnalyticsEvent)) {
    return event as RitualAnalyticsEvent;
  }
  switch (event) {
    case 'locked_content_tapped':
      return 'deeper_layer_tapped';
    case 'reading_revealed':
      return 'expanded_reading_requested';
    case 'premium_paywall_triggered':
      return 'private_archive_prompt_viewed';
    case 'paywall_viewed':
      return 'premium_continuation_viewed';
    default:
      return null;
  }
}

export function isLegacyAliasEvent(
  event: AnalyticsEvent | string,
  properties?: Partial<AnalyticsMigrationMetadata>,
): boolean {
  return properties?.emissionMode === 'legacy_alias' || BRIDGED_LEGACY_EVENTS.includes(event as AnalyticsEvent);
}

function shouldWarnOnDirectLegacyEvent(
  event: AnalyticsEvent,
  properties: Partial<AnalyticsMigrationMetadata>,
): boolean {
  return (
    readEnv('NODE_ENV') !== 'production' &&
    BRIDGED_LEGACY_EVENTS.includes(event) &&
    properties.emissionMode !== 'legacy_alias' &&
    !warnedDirectLegacyEvents.has(event)
  );
}

function warnOnDirectLegacyEvent(event: AnalyticsEvent, properties: AnalyticsProperties): void {
  if (!shouldWarnOnDirectLegacyEvent(event, properties)) return;
  warnedDirectLegacyEvents.add(event);
  const canonical = normalizeRitualEventName(event);
  if (typeof console?.warn === 'function') {
    console.warn(
      `[analytics] ${event} is a bridged legacy event. Use trackRitualEvent(${canonical ?? 'canonical_event'}, ...) for new Home/ritual code.`,
    );
  }
}

export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  initialized = true;
  analyticsEnabled = (await AsyncStorage.getItem(CONSENT_KEY)) === 'granted';
  if (analyticsEnabled) installId = await getInstallId();
}

export async function getAnalyticsConsent(): Promise<boolean> {
  return (await AsyncStorage.getItem(CONSENT_KEY)) === 'granted';
}

export async function setAnalyticsConsent(allowed: boolean): Promise<void> {
  analyticsEnabled = allowed;
  await AsyncStorage.setItem(CONSENT_KEY, allowed ? 'granted' : 'declined');
  if (allowed) installId = await getInstallId();
}

export async function track<E extends ClientEmittableEvent>(
  event: E,
  properties: AnalyticsEventMap[E],
): Promise<void> {
  // Ownership guard (defensive, mirrors the compile-time `ClientEmittableEvent` bound): never let a
  // backend-owned event leave the mobile client. See docs/analytics-event-ownership.md.
  if (isBackendOwnedEvent(event)) {
    if (readEnv('NODE_ENV') !== 'production' && typeof console?.warn === 'function') {
      console.warn(`[analytics] "${event}" is BACKEND_OWNED and must not be emitted from the mobile client.`);
    }
    return;
  }
  warnOnDirectLegacyEvent(event, properties as AnalyticsProperties);
  if (!analyticsEnabled) return;
  const key = posthogKey();
  if (!key) return;
  const distinctId = installId ?? (await getInstallId());
  installId = distinctId;
  const payload = {
    api_key: key,
    event,
    properties: {
      distinct_id: distinctId,
      app: 'mobile',
      platform: Platform.OS,
      ...sanitizeAnalyticsProperties(properties),
    },
  };
  try {
    await fetch(`${posthogHost().replace(/\/$/, '')}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics must never block product flows.
  }
}

const LEGACY_PAYWALL_SOURCES: readonly LegacyPaywallSource[] = [
  'premium_screen',
  'locked_preview',
  'profile_card',
  'post_reading',
  'onboarding_teaser',
  'saved_reflection',
  'rhythm_insight',
  'relationship_atmosphere',
  'natal_resonance',
];

const LEGACY_READING_SURFACES: readonly LegacyReadingSurface[] = [
  'tarot',
  'crystal',
  'transit',
  'moon',
  'affirmation',
];

const LEGACY_HOROSCOPE_PERIODS: readonly LegacyHoroscopePeriod[] = [
  'yesterday',
  'tomorrow',
  'weekly',
  'monthly',
  'annual',
];

function legacyPaywallSource(properties: RitualAnalyticsPayload): LegacyPaywallSource {
  if (properties.trigger === 'period_tab' || properties.continuationType === 'period_depth') {
    return 'locked_preview';
  }
  if (LEGACY_PAYWALL_SOURCES.includes(properties.source as LegacyPaywallSource)) {
    return properties.source as LegacyPaywallSource;
  }
  return properties.source === 'profile_card' ? 'profile_card' : 'post_reading';
}

function legacyReadingSurface(properties: RitualAnalyticsPayload): LegacyReadingSurface | null {
  if (LEGACY_READING_SURFACES.includes(properties.readingType as LegacyReadingSurface)) {
    return properties.readingType as LegacyReadingSurface;
  }
  if (LEGACY_READING_SURFACES.includes(properties.continuationType as LegacyReadingSurface)) {
    return properties.continuationType as LegacyReadingSurface;
  }
  return null;
}

function legacyHoroscopePeriod(properties: RitualAnalyticsPayload): LegacyHoroscopePeriod | null {
  if (LEGACY_HOROSCOPE_PERIODS.includes(properties.readingType as LegacyHoroscopePeriod)) {
    return properties.readingType as LegacyHoroscopePeriod;
  }
  if (LEGACY_HOROSCOPE_PERIODS.includes(properties.continuationType as LegacyHoroscopePeriod)) {
    return properties.continuationType as LegacyHoroscopePeriod;
  }
  return null;
}

export function legacyAnalyticsEventsFor(
  event: RitualAnalyticsEvent,
  properties: RitualAnalyticsPayload,
): LegacyAnalyticsBridge[] {
  switch (event) {
    case 'deeper_layer_tapped': {
      const period = legacyHoroscopePeriod(properties);
      return [
        {
          event: 'locked_content_tapped',
          properties: period
            ? { surface: 'horoscope_period', period }
            : { surface: 'home_module' },
        },
      ];
    }
    case 'premium_continuation_viewed':
    case 'premium_continuation_tapped':
      return [
        {
          event: 'paywall_viewed',
          properties: { source: legacyPaywallSource(properties) },
        },
      ];
    case 'private_archive_prompt_viewed':
      return [
        {
          event: 'paywall_viewed',
          properties: { source: legacyPaywallSource(properties) },
        },
        {
          event: 'premium_paywall_triggered',
          properties: { source: legacyPaywallSource(properties) },
        },
      ];
    case 'expanded_reading_requested': {
      const surface = legacyReadingSurface(properties);
      return surface ? [{ event: 'reading_revealed', properties: { surface } }] : [];
    }
    case 'ritual_moment_continued':
      return [];
    default:
      return [];
  }
}

function canonicalRitualProperties(
  event: RitualAnalyticsEvent,
  properties: RitualAnalyticsPayload,
): RitualAnalyticsPayload {
  return {
    ...properties,
    analyticsSchemaVersion: ANALYTICS_SCHEMA_VERSION,
    ritualEventMigration: true,
    canonicalEventName: event,
    emissionMode: 'canonical',
  };
}

function legacyAliasProperties(
  canonicalEvent: RitualAnalyticsEvent,
  legacyEvent: LegacyAnalyticsBridge,
): LegacyAnalyticsBridge['properties'] {
  return {
    ...legacyEvent.properties,
    analyticsSchemaVersion: ANALYTICS_SCHEMA_VERSION,
    ritualEventMigration: true,
    legacyEventAlias: legacyEvent.event,
    canonicalEventName: canonicalEvent,
    emissionMode: 'legacy_alias',
  } as LegacyAnalyticsBridge['properties'];
}

export async function trackRitualEvent(
  event: RitualAnalyticsEvent,
  properties: RitualAnalyticsPayload,
): Promise<void> {
  // Temporary dual emission keeps legacy dashboards stable while Home and ritual code
  // move to continuation-oriented product language.
  const canonicalEvent = normalizeRitualEventName(event) ?? event;
  await track(canonicalEvent, canonicalRitualProperties(canonicalEvent, properties));
  const legacyEvents = legacyAnalyticsEventsFor(event, properties);
  for (const legacyEvent of legacyEvents) {
    await track(legacyEvent.event, legacyAliasProperties(canonicalEvent, legacyEvent));
  }
}

export async function trackDailyActiveOnce(properties: AnalyticsEventMap['daily_active']): Promise<void> {
  const key = `${DAILY_ACTIVE_KEY_PREFIX}${properties.date}`;
  if ((await AsyncStorage.getItem(key)) === '1') return;
  await AsyncStorage.setItem(key, '1');
  await track('daily_active', properties);
}
