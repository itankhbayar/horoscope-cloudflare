export type AppBindings = {
  horoscope_db: D1Database;
  JWT_SECRET: string;
  CRON_TIMEZONE?: string;
  ADMIN_SECRET?: string;
};

export type AppVariables = {
  userId: string;
  userEmail: string;
};
