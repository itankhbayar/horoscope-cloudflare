type AnalyticsEvent =
  | 'app_open'
  | 'signup_started'
  | 'signup_completed'
  | 'login'
  | 'horoscope_viewed'
  | 'compatibility_viewed'
  | 'paywall_viewed'
  | 'checkout_started'
  | 'premium_purchased'
  | 'subscription_restored'
  | 'horoscope_share_card_opened'
  | 'horoscope_share_card_generated'
  | 'horoscope_share_card_shared'
  | 'horoscope_share_card_failed'
  | 'daily_ritual_completed'
  | 'streak_completion_celebrated'
  | 'streak_milestone_reached'
  | 'daily_ritual_completion_replayed_blocked';

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

let enabled = false;
let posthogClient: typeof import('posthog-js').default | null = null;
const queuedEvents: Array<{ event: AnalyticsEvent; properties: AnalyticsProperties }> = [];
let initializationStarted = false;

export function initAnalytics(): void {
  if (enabled) return;
  if (posthogClient) {
    posthogClient.opt_in_capturing();
    enabled = true;
    for (const item of queuedEvents.splice(0)) {
      track(item.event, item.properties);
    }
    return;
  }
  const key = import.meta.env.VITE_POSTHOG_KEY?.trim();
  if (!key) return;
  initializationStarted = true;
  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
      capture_pageview: false,
      autocapture: false,
      persistence: 'localStorage+cookie',
      loaded: () => {
        posthogClient = posthog;
        enabled = true;
        for (const item of queuedEvents.splice(0)) {
          track(item.event, item.properties);
        }
      },
    });
    if (!posthogClient) {
      posthogClient = posthog;
      enabled = true;
    }
  });
}

export function shutdownAnalytics(): void {
  queuedEvents.length = 0;
  if (posthogClient) {
    posthogClient.opt_out_capturing();
    posthogClient.reset();
  }
  enabled = false;
}

export function identifyAnalyticsUser(userId: string | null): void {
  if (!enabled || !posthogClient) return;
  if (userId) posthogClient.identify(userId);
  else posthogClient.reset();
}

export function track(event: AnalyticsEvent, properties: AnalyticsProperties = {}): void {
  if (!enabled || !posthogClient) {
    if (initializationStarted) queuedEvents.push({ event, properties });
    return;
  }
  posthogClient.capture(event, {
    ...properties,
    app: 'web',
  });
}
