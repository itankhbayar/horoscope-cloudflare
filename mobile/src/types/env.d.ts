interface ImportMetaEnv {
  readonly MODE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_APP_RELEASE?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'posthog-js' {
  type Properties = Record<string, unknown>;

  interface PostHog {
    init(
      key: string,
      options: {
        api_host?: string;
        capture_pageview?: boolean;
        autocapture?: boolean;
        persistence?: string;
        loaded?: () => void;
      },
    ): void;
    opt_in_capturing(): void;
    opt_out_capturing(): void;
    reset(): void;
    identify(userId: string): void;
    capture(event: string, properties?: Properties): void;
  }

  const posthog: PostHog;
  export default posthog;
}

declare module '@sentry/vue' {
  import type { App } from 'vue';
  import type { Router } from 'vue-router';

  type Scope = {
    setContext(key: string, value: Record<string, unknown>): void;
  };

  export function init(options: {
    app: App;
    dsn: string;
    environment?: string;
    release?: string;
    integrations?: unknown[];
    tracesSampleRate?: number;
  }): void;
  export function browserTracingIntegration(options: { router: Router }): unknown;
  export function withScope(callback: (scope: Scope) => void): void;
  export function captureException(error: unknown): void;
}

declare module 'vue' {
  export type App = unknown;
}

declare module 'vue-router' {
  export type Router = unknown;
}
