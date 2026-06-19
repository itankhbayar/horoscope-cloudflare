type AnalyticsEvent =
  | 'app_open'
  | 'signup_started'
  | 'signup_completed'
  | 'login'
  | 'horoscope_viewed'
  | 'compatibility_viewed'
  | 'paywall_viewed'
  | 'guest_result_gate_shown'
  | 'tarot_card_drawn'
  | 'checkout_started'
  | 'premium_purchased'
  /**
   * Client-side paywall CTA tap only. `trial_started` is intentionally NOT a client event —
   * it is emitted server-side by the Stripe webhook once a subscription enters `trialing`,
   * so the trial funnel has a single authoritative source and never double-counts.
   */
  | 'trial_cta_clicked'
  | 'subscription_restored'
  | 'horoscope_share_card_opened'
  | 'horoscope_share_card_generated'
  | 'horoscope_share_card_shared'
  | 'horoscope_share_card_failed'
  | 'compatibility_share_card_viewed'
  | 'compatibility_share_cta_clicked'
  | 'compatibility_share_link_created'
  | 'compatibility_share_completed'
  | 'compatibility_share_cancelled'
  | 'compatibility_share_failed'
  | 'compatibility_share_landing_viewed'
  | 'compatibility_landing_score_displayed'
  | 'compatibility_landing_sign_selected'
  | 'compatibility_guest_compare_completed'
  | 'compatibility_landing_cta_clicked'
  | 'daily_reading_reveal_clicked'
  | 'daily_reading_revealed'
  | 'first_horoscope_revealed'
  | 'daily_reading_already_revealed'
  | 'daily_ritual_completed'
  | 'streak_completion_celebrated'
  | 'streak_milestone_reached'
  | 'daily_ritual_completion_replayed_blocked'
  | 'onboarding_started'
  | 'birth_data_completed'
  | 'first_value_shown'
  | 'account_creation_prompt_shown'
  | 'account_created_after_value'
  | 'onboarding_abandoned'
  | 'preview_viewed'
  | 'preview_cta_clicked'
  | 'preview_birth_time_added'
  | 'preview_account_created';

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

/**
 * OWNERSHIP — single source of truth: `docs/analytics-event-ownership.md`.
 * Events the BACKEND owns and emits server-side (Stripe / RevenueCat webhooks). The web client
 * must never emit these or the trial funnel double-counts. Mirror of backend `BACKEND_OWNED_EVENTS`;
 * the backend cross-source test pins all three copies to the same list.
 */
export const BACKEND_OWNED_EVENTS = ['trial_started', 'trial_converted', 'trial_cancelled'] as const;
export type BackendOwnedEvent = (typeof BACKEND_OWNED_EVENTS)[number];

/** Events this client is permitted to emit: everything except backend-owned funnel events. */
export type ClientEmittableEvent = Exclude<AnalyticsEvent, BackendOwnedEvent>;

/** True when `event` is backend-owned and therefore forbidden to the web client. */
export function isBackendOwnedEvent(event: string): boolean {
  return (BACKEND_OWNED_EVENTS as readonly string[]).includes(event);
}

/** The analytics event fired when a user taps the paywall CTA (never `trial_started`). */
export const PAYWALL_CTA_EVENT: ClientEmittableEvent = 'trial_cta_clicked';

let enabled = false;
let posthogClient: typeof import('posthog-js').default | null = null;
const queuedEvents: Array<{ event: ClientEmittableEvent; properties: AnalyticsProperties }> = [];
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

export function track(event: ClientEmittableEvent, properties: AnalyticsProperties = {}): void {
  // Ownership guard (defensive, mirrors the compile-time `ClientEmittableEvent` bound): never let a
  // backend-owned event leave the web client. See docs/analytics-event-ownership.md.
  if (isBackendOwnedEvent(event)) {
    // Cast keeps this file type-safe under both the web (vite) and mobile tsconfigs, which compile
    // it via the `@astralis/lib/*` path alias and define different `ImportMetaEnv` shapes.
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV === true) {
      console.warn(`[analytics] "${event}" is BACKEND_OWNED and must not be emitted from the web client.`);
    }
    return;
  }
  if (!enabled || !posthogClient) {
    if (initializationStarted) queuedEvents.push({ event, properties });
    return;
  }
  posthogClient.capture(event, {
    ...properties,
    app: 'web',
  });
}
