import * as Sentry from '@sentry/cloudflare';
import type { AppBindings } from '../types';

export function sentryOptions(env: AppBindings): Sentry.CloudflareOptions | undefined {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) return undefined;
  return {
    dsn,
    environment: env.APP_ENV ?? env.ENVIRONMENT ?? 'production',
    release: env.SENTRY_RELEASE,
    tracesSampleRate: Number(env.SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
  };
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!Sentry.isInitialized()) return;
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context ?? {})) {
      scope.setContext(key, value as Record<string, unknown>);
    }
    Sentry.captureException(error);
  });
}
