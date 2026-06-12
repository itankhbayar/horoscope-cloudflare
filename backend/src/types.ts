import type { User } from './db/schema';

export type AppBindings = {
  horoscope_db: D1Database;
  LOGIN_RATE_LIMITER?: RateLimit;
  REGISTER_RATE_LIMITER?: RateLimit;
  REFRESH_RATE_LIMITER?: RateLimit;
  PUBLIC_RATE_LIMITER?: RateLimit;
  RATE_LIMITER_DO?: DurableObjectNamespace;
  /** R2 bucket for profile avatars (configure in wrangler `r2_buckets`). */
  STORAGE?: R2Bucket;
  /** Public web app URL for Stripe checkout redirects (no trailing slash). */
  APP_PUBLIC_URL: string;
  JWT_SECRET: string;
  /** Enables HaveIBeenPwned k-anonymity password checks for new registrations. Disabled by default. */
  PWNED_PASSWORD_CHECK_ENABLED?: string;
  /** When true and HIBP checks are enabled, reject registration if the check is unavailable. */
  PWNED_PASSWORD_FAIL_CLOSED?: string;
  CRON_TIMEZONE?: string;
  /** Anthropic API key (secret) used by the daily cron to generate horoscopes with Claude Sonnet. When unset, the cron falls back to templates. */
  ANTHROPIC_API_KEY?: string;
  AVATAR_PUBLIC_BASE_URL?: string;
  ADMIN_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  /** Optional extra test price ID allowed for POST /api/billing/mobile/checkout (same Stripe product/test mode). */
  STRIPE_PREMIUM_PRICE_ID_TEST?: string;
  /** RevenueCat REST API key (secret) for subscriber sync from mobile restore. */
  REVENUECAT_API_KEY?: string;
  /** Authorization secret configured in RevenueCat webhook settings. */
  REVENUECAT_WEBHOOK_SECRET?: string;
  /** Optional Expo access token for push delivery (Enhanced Security for Push Notifications). */
  EXPO_ACCESS_TOKEN?: string;
  /** PostHog project API key for the backend funnel mirror. When unset, mirroring is a no-op. */
  POSTHOG_API_KEY?: string;
  /** PostHog ingestion host (defaults to https://us.i.posthog.com). */
  POSTHOG_HOST?: string;
  /** Deployment environment label for logs and Sentry. */
  APP_ENV?: string;
  ENVIRONMENT?: string;
  SENTRY_DSN?: string;
  SENTRY_RELEASE?: string;
  SENTRY_TRACES_SAMPLE_RATE?: string;
};

export type AppVariables = {
  userId: string;
  userEmail: string;
  user: User;
  requestId: string;
};
