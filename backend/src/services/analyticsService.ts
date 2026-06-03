import type { AppBindings } from '../types';
import { log } from '../utils/logger';

/**
 * Backend → PostHog funnel mirror.
 *
 * Single responsibility: take a server-authoritative funnel event and forward it to PostHog
 * with a stable user `distinct_id`, so founders can analyse activation/subscription funnels in
 * PostHog alone (no Worker-log joins). This is the ONLY place that talks to PostHog from the
 * backend — business logic must call `trackBackendEvent` rather than embedding PostHog calls.
 *
 * It mirrors only events that are NOT already emitted to PostHog by the clients (today: the
 * trial lifecycle, which is server-authoritative and otherwise absent from PostHog). Operational
 * metrics and client-sourced funnel events are intentionally out of scope to avoid double counting.
 *
 * Reliability: never throws, never blocks a request, fails open. Worker `metric()` logs remain
 * the primary operational telemetry and are unaffected.
 */

const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com';

/**
 * OWNERSHIP — single source of truth: `docs/analytics-event-ownership.md`.
 *
 * These are the only events the backend is allowed to send to PostHog (BACKEND_OWNED). The Stripe
 * and RevenueCat webhooks are the single authoritative source for the trial funnel, so clients must
 * never emit these names. Enforcement:
 *   - clients narrow `track()` to exclude these (compile-time),
 *   - `trackBackendEvent` refuses anything not in this list (runtime, below),
 *   - `analyticsOwnership.crossSource.test.ts` scans client source for forbidden emissions (CI).
 *
 * Mirror copies live in `frontend/src/lib/analytics.ts` and `mobile/src/lib/analytics.ts`; the
 * cross-source test pins all three to the same list. Adding a new backend-owned event means
 * updating this list, the doc, and the client mirrors together.
 */
export const BACKEND_OWNED_EVENTS = ['trial_started', 'trial_converted', 'trial_cancelled'] as const;

/** Events the backend is the source of truth for and which are absent from client PostHog. */
export type BackendFunnelEvent = (typeof BACKEND_OWNED_EVENTS)[number];

/** True when `event` is a backend-owned funnel event (the backend's exclusive PostHog territory). */
export function isBackendOwnedEvent(event: string): event is BackendFunnelEvent {
  return (BACKEND_OWNED_EVENTS as readonly string[]).includes(event);
}

export type BackendAnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export type TrackBackendEventResult =
  | 'sent'
  | 'skipped_disabled'
  | 'skipped_no_distinct_id'
  | 'failed';

export interface TrackBackendEventInput {
  env: Partial<AppBindings>;
  /** Stable user identifier (users.id). Required — we never invent ids. */
  distinctId: string | null | undefined;
  event: BackendFunnelEvent;
  properties?: BackendAnalyticsProperties;
}

function posthogEnabled(env: Partial<AppBindings>): boolean {
  return Boolean(env.POSTHOG_API_KEY && env.POSTHOG_API_KEY.trim());
}

function posthogHost(env: Partial<AppBindings>): string {
  return (env.POSTHOG_HOST?.trim() || POSTHOG_DEFAULT_HOST).replace(/\/$/, '');
}

function sanitize(properties: BackendAnalyticsProperties): BackendAnalyticsProperties {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([, v]) => v === null || v === undefined || ['string', 'number', 'boolean'].includes(typeof v),
    ),
  );
}

/**
 * Mirror a funnel event to PostHog. Resolves to a status string and never rejects.
 * - No PostHog key configured → `skipped_disabled` (local/dev safe, fail open).
 * - No stable distinct_id → `skipped_no_distinct_id` (we do not fabricate ids).
 */
export async function trackBackendEvent(input: TrackBackendEventInput): Promise<TrackBackendEventResult> {
  try {
    // Ownership guard: the backend mirrors ONLY backend-owned events. This stops a future caller
    // (e.g. someone "promoting" a client-owned metric like premium_purchased to PostHog) from
    // double-counting against the client source. See docs/analytics-event-ownership.md.
    if (!isBackendOwnedEvent(input.event)) {
      log(input.env, 'warn', 'posthog_mirror_blocked_not_backend_owned', { event: input.event });
      return 'failed';
    }
    if (!posthogEnabled(input.env)) return 'skipped_disabled';
    const distinctId = input.distinctId?.trim();
    if (!distinctId) return 'skipped_no_distinct_id';

    const res = await fetch(`${posthogHost(input.env)}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: input.env.POSTHOG_API_KEY!.trim(),
        event: input.event,
        properties: {
          distinct_id: distinctId,
          app: 'backend',
          $lib: 'astralis-worker',
          ...sanitize(input.properties ?? {}),
        },
      }),
    });

    if (!res.ok) {
      log(input.env, 'warn', 'posthog_mirror_failed', { event: input.event, status: res.status });
      return 'failed';
    }
    return 'sent';
  } catch (err) {
    // Analytics must never break business logic — swallow and report via logs only.
    log(input.env, 'warn', 'posthog_mirror_error', { event: input.event, error: err });
    return 'failed';
  }
}
