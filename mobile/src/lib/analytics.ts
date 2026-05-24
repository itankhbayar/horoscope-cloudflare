import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnalyticsEventMap = {
  app_open: { source?: 'cold_start' | 'resume' };
  daily_active: { date: string; hasBirthProfile: boolean; isPremium: boolean };
  onboarding_started: { hasBirthProfile: boolean };
  onboarding_completed: { hasBirthProfile: boolean };
  signup_started: { step?: string };
  signup_completed: { hasBirthProfile: boolean };
  paywall_viewed: { source: 'premium_screen' | 'locked_preview' | 'profile_card' | 'post_reading' | 'onboarding_teaser' };
  checkout_started: { plan?: 'monthly' | 'yearly'; provider: 'revenuecat' | 'stripe' };
  premium_purchased: { provider: 'revenuecat' | 'stripe'; source: 'purchase_sync' | 'restore_sync' };
  subscription_restored: { provider: 'revenuecat' | 'stripe'; active: boolean };
  notification_settings_viewed: { canRequestPush: boolean };
  notification_opt_in_started: { source: 'settings' };
  notification_opt_in_completed: { source: 'settings' };
  notification_opt_in_failed: { reason: 'permission_denied' | 'unavailable' | 'network' | 'unknown' };
  notification_opt_out: { source: 'settings' };
  horoscope_viewed: {
    source: 'home';
    period: 'yesterday' | 'today' | 'tomorrow' | 'weekly' | 'monthly' | 'annual';
    isPremium: boolean;
  };
  locked_content_tapped: {
    surface: 'horoscope_period' | 'home_module';
    period?: 'yesterday' | 'tomorrow' | 'weekly' | 'monthly' | 'annual';
  };
  reading_revealed: { surface: 'tarot' | 'crystal' | 'transit' | 'moon' | 'affirmation' };
  streak_started: { streakCount: number };
  streak_milestone: { streakCount: number; milestone: number };
  streak_freeze_used: { streakCount: number; freezesRemaining: number };
  streak_lost: { previousStreak?: number };
};

export type AnalyticsEvent = keyof AnalyticsEventMap;

type Primitive = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, Primitive>;

const CONSENT_KEY = 'analytics:consent';
const INSTALL_ID_KEY = 'analytics:install-id';
const DAILY_ACTIVE_KEY_PREFIX = 'analytics:daily-active:';

let analyticsEnabled = false;
let initialized = false;
let installId: string | null = null;

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

export async function track<E extends AnalyticsEvent>(
  event: E,
  properties: AnalyticsEventMap[E],
): Promise<void> {
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

export async function trackDailyActiveOnce(properties: AnalyticsEventMap['daily_active']): Promise<void> {
  const key = `${DAILY_ACTIVE_KEY_PREFIX}${properties.date}`;
  if ((await AsyncStorage.getItem(key)) === '1') return;
  await AsyncStorage.setItem(key, '1');
  await track('daily_active', properties);
}
