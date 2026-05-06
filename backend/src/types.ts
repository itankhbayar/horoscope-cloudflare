export type AppBindings = {
  horoscope_db: D1Database;
  /** R2 bucket for profile avatars (configure in wrangler `r2_buckets`). */
  STORAGE?: R2Bucket;
  JWT_SECRET: string;
  CRON_TIMEZONE?: string;
  AVATAR_PUBLIC_BASE_URL?: string;
  ADMIN_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  /** Optional extra test price ID allowed for POST /api/billing/mobile/checkout (same Stripe product/test mode). */
  STRIPE_PREMIUM_PRICE_ID_TEST?: string;
};

export type AppVariables = {
  userId: string;
  userEmail: string;
};
