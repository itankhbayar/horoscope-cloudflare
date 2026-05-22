import type { App } from 'vue';
import type { Router } from 'vue-router';

let enabled = false;
let sentryClient: typeof import('@sentry/vue') | null = null;

export function initErrorTracking(app: App, router: Router): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;
  void import('@sentry/vue').then((Sentry) => {
    Sentry.init({
      app,
      dsn,
      environment: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,
      release: import.meta.env.VITE_APP_RELEASE,
      integrations: [Sentry.browserTracingIntegration({ router })],
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
    });
    sentryClient = Sentry;
    enabled = true;
  });
}

export function captureFrontendException(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled || !sentryClient) return;
  sentryClient.withScope((scope) => {
    for (const [key, value] of Object.entries(context ?? {})) {
      scope.setContext(key, value as Record<string, unknown>);
    }
    sentryClient?.captureException(error);
  });
}
