export type AppBindings = {
  horoscope_db: D1Database;
  JWT_SECRET: string;
  CRON_TIMEZONE?: string;
  ADMIN_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
};

export type AppVariables = {
  userId: string;
  userEmail: string;
};
