import type { User } from './db/schema';

export type AppBindings = {
  horoscope_db: D1Database;
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
